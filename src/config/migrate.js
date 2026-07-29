import dns from "node:dns";
import { MongoClient } from "mongodb";

// DNS Fix
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const SOURCE_URI =
  "mongodb+srv://karankusheldigisolution_db_user:bh4IWCL9i6abHWJH@vardaan.thie8gx.mongodb.net/test?retryWrites=true&w=majority";

const TARGET_URI = "mongodb+srv://vardaan1225_db_user:042OHLSWTUbx18x1@vardaan.qwuehht.mongodb.net";

const SOURCE_DB = "test";
const TARGET_DB = "vardaan-ecom";

async function migrate() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log("🔄 Connecting to Atlas...");
    await sourceClient.connect();
    console.log("✅ Atlas Connected");

    console.log("🔄 Connecting to Local MongoDB...");
    await targetClient.connect();
    console.log("✅ Local MongoDB Connected");

    const sourceDb = sourceClient.db(SOURCE_DB);
    const targetDb = targetClient.db(TARGET_DB);

    const collections = await sourceDb.listCollections().toArray();

    console.log(`\n📦 Found ${collections.length} collections\n`);

    for (const { name } of collections) {
      try {
        console.log(`==============================`);
        console.log(`🚀 Migrating: ${name}`);

        const sourceCollection = sourceDb.collection(name);
        const targetCollection = targetDb.collection(name);

        // Delete old data
        await targetCollection.deleteMany({});

        // Copy documents
        const docs = await sourceCollection.find({}).toArray();

        if (docs.length > 0) {
          await targetCollection.insertMany(docs, {
            ordered: false,
          });
        }

        console.log(`📄 Copied ${docs.length} documents`);

        // Copy indexes
        const indexes = await sourceCollection.indexes();

        for (const index of indexes) {
          if (index.name === "_id_") continue;

          const { key, name, ns, v, ...options } = index;

          // Remove null & undefined values
          Object.keys(options).forEach((k) => {
            if (options[k] === null || options[k] === undefined) {
              delete options[k];
            }
          });

          try {
            await targetCollection.createIndex(key, options);
            console.log(`   ✅ Index Created: ${index.name}`);
          } catch (err) {
            console.log(
              `   ⚠️ Index ${index.name} skipped (${err.message})`
            );
          }
        }

        console.log(`✅ ${name} Completed\n`);
      } catch (err) {
        console.error(`❌ Error in collection ${name}`);
        console.error(err.message);
        console.log("➡️ Continuing...\n");
      }
    }

    console.log("\n🎉 Migration Completed Successfully!");
  } catch (err) {
    console.error("❌ Migration Failed");
    console.error(err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
    console.log("🔒 Connections Closed");
  }
}

migrate();