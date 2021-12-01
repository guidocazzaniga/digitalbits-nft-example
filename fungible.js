const DigitalBitsSdk = require("xdb-digitalbits-sdk");
const fetch = require('node-fetch');


async function main() {
    const pair1 = DigitalBitsSdk.Keypair.random();
    const pair2 = DigitalBitsSdk.Keypair.random();
    const pair3 = DigitalBitsSdk.Keypair.random();

    //generate distributor keypair
    let distributorSecret = pair1.secret();
    let distributorPublic = pair1.publicKey();

    //generate issuer keypair
    let issuerSecret = pair2.secret();
    let issuerPublic = pair2.publicKey();

    //generate user keypair
    let userSecret = pair3.secret();
    let userPublic = pair3.publicKey();

    //create and fund the three accounts
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

    try {
        const response = await fetch(
            `https://friendbot.testnet.digitalbits.io?addr=${encodeURIComponent(
                userPublic,
            )}`,
        );
        const responseJSON = await response.json();
        console.log("   SUCCESS! user account created : " + userPublic + "\n")
    } catch (e) {
        console.error("ERROR!", e);
    }

    //get accounts
    const server = new DigitalBitsSdk.Server("https://frontier.testnet.digitalbits.io");
    var distAccount = await server.loadAccount(distributorPublic);
    var issAccount = await server.loadAccount(issuerPublic);
    var userAccount = await server.loadAccount(userPublic);

    var memo = DigitalBitsSdk.Memo.text('Trust line');
    var asset = new DigitalBitsSdk.Asset('PoliToken', issuerPublic)

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

    console.log("   Creating trustline between user and issuer...\n");

    var transaction = new DigitalBitsSdk.TransactionBuilder(userAccount, {
        fee: DigitalBitsSdk.BASE_FEE,
        networkPassphrase: DigitalBitsSdk.Networks.TESTNET,
        memo: memo
    })
        .addOperation(DigitalBitsSdk.Operation.changeTrust({ //create trust line between user account and issuer
            asset: asset,
        }))
        .setTimeout(30)
        .build();
    transaction.sign(pair3);

    let receipt2 = await server.submitTransaction(transaction);

    console.log("   Trustline created - "+receipt2._links.transaction.href + "\n");

    memo = DigitalBitsSdk.Memo.text('Token creation');

    var transaction = new DigitalBitsSdk.TransactionBuilder(issAccount, {
        fee: DigitalBitsSdk.BASE_FEE,
        networkPassphrase: DigitalBitsSdk.Networks.TESTNET,
        memo: memo
    })
        .addOperation(DigitalBitsSdk.Operation.payment({ //mint tokens to distributor account
            destination: distributorPublic,
            amount: "200",
            asset: asset
        }))
        .addOperation(DigitalBitsSdk.Operation.manageData({ //add metadata to token
            name: 'metadata',
            value: 'https://imgur.com/a/rynaTk1'
        }))
        .setTimeout(30)
        .build();
    transaction.sign(pair2);
    let receipt3 = await server.submitTransaction(transaction);

    console.log('   Token created successfully - ', receipt3._links.transaction.href + "\n")

    //refresh balances
    distAccount = await server.loadAccount(distributorPublic);
    issAccount = await server.loadAccount(issuerPublic);

    console.log("   Balances for account: " + distributorPublic + " (distributor)");
    distAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance);
    });

    console.log("   Balances for account: " + userPublic + " (user)");
    userAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance,"\n");
    });

    console.log('   Sending 30 tokens to user...\n')

    var transaction = new DigitalBitsSdk.TransactionBuilder(distAccount, {
        fee: DigitalBitsSdk.BASE_FEE,
        networkPassphrase: DigitalBitsSdk.Networks.TESTNET,
    })
    .addOperation(DigitalBitsSdk.Operation.payment({ //send 30 tokens to user account
        destination: userPublic,
        amount: "30",
        asset: asset
    }))
    .setTimeout(30)
    .build();
    transaction.sign(pair1);
    let receipt4 = await server.submitTransaction(transaction);

    console.log('   Token sent successfully - ', receipt4._links.transaction.href + "\n")
    
    //refresh balances
    distAccount = await server.loadAccount(distributorPublic);
    userAccount = await server.loadAccount(userPublic);
    
    console.log("   Balances for account: " + distributorPublic + " (distributor)");
    distAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance);
    });

    console.log("   Balances for account: " + userPublic + " (user)");
    userAccount.balances.forEach(function (balance) {
        console.log("       Type: ", balance.asset_type, ", Balance: ", balance.balance);
    });

}



main()