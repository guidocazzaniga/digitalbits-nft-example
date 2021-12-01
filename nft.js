const DigitalBitsSdk = require("xdb-digitalbits-sdk");
const fetch = require('node-fetch');


async function main() {
    const pair1 = DigitalBitsSdk.Keypair.random();
    const pair2 = DigitalBitsSdk.Keypair.random();

    //generate distributor keypair
    let distributorSecret = pair1.secret();
    let distributorPublic = pair1.publicKey();

    //generate issuer keypair
    let issuerSecret = pair2.secret();
    let issuerPublic = pair2.publicKey();

    //create and fund the two accounts
    try {
        const response = await fetch(
            `https://friendbot.testnet.digitalbits.io?addr=${encodeURIComponent(
                distributorPublic,
            )}`,
        );
        const responseJSON = await response.json();
        console.log("   SUCCESS! distributor account created : " + distributorPublic + "\n")
    } catch (e) {
        console.error("ERROR!", e);
    }

    try {
        const response = await fetch(
            `https://friendbot.testnet.digitalbits.io?addr=${encodeURIComponent(
                issuerPublic,
            )}`,
        );
        const responseJSON = await response.json();
        console.log("   SUCCESS! issuer account created : " + issuerPublic + "\n")
    } catch (e) {
        console.error("ERROR!", e);
    }

    //check balances

    const server = new DigitalBitsSdk.Server("https://frontier.testnet.digitalbits.io");
    var distAccount = await server.loadAccount(distributorPublic);
    var issAccount = await server.loadAccount(issuerPublic);
    console.log("   Balances for account: " + distributorPublic + " (distributor)");
    distAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance);
    });

    console.log("   Balances for account: " + issuerPublic + " (issuer)");
    issAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance + "\n");
    });

    var memo = DigitalBitsSdk.Memo.text('Poli NFT');
    var asset = new DigitalBitsSdk.Asset('PoliNFT', issuerPublic)


    console.log("   Creating trustline between distributor and issuer...\n");

    var transaction = new DigitalBitsSdk.TransactionBuilder(distAccount, {
        fee: DigitalBitsSdk.BASE_FEE,
        networkPassphrase: DigitalBitsSdk.Networks.TESTNET,
        memo: memo
    })
        .addOperation(DigitalBitsSdk.Operation.changeTrust({ //create trust line between distributor account and issuer
            asset: asset,
        }))
        .setTimeout(30)
        .build();
    transaction.sign(pair1);

    let receipt1 = await server.submitTransaction(transaction);

    console.log("   Trustline created - "+receipt1._links.transaction.href + "\n");


    var transaction = new DigitalBitsSdk.TransactionBuilder(issAccount, {
        fee: DigitalBitsSdk.BASE_FEE,
        networkPassphrase: DigitalBitsSdk.Networks.TESTNET,
        memo: memo
    })
        .addOperation(DigitalBitsSdk.Operation.payment({ //mint nft to distributor account
            destination: distributorPublic,
            amount: "1",
            asset: asset
        }))
        .addOperation(DigitalBitsSdk.Operation.manageData({ //add metadata to nft
            name: 'metadata',
            value: 'https://imgur.com/a/rynaTk1'
        }))
        .addOperation(DigitalBitsSdk.Operation.setOptions({ //issuer cannot mint other units of this asset
            masterWeight: '0'
        }))
        .setTimeout(30)
        .build();
    transaction.sign(pair2);
    let receipt2 = await server.submitTransaction(transaction);

    console.log('   NFT created successfully - ', receipt2._links.transaction.href + "\n")


    distAccount = await server.loadAccount(distributorPublic);
    issAccount = await server.loadAccount(issuerPublic);

    console.log("   Balances for account: " + distributorPublic + " (distributor)");
    distAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance);
    });

    console.log("   Balances for account: " + issuerPublic + " (issuer)");
    issAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance + "\n");
    });

}



main()