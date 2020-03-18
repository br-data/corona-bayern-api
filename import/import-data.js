const toDashcase = require('../lib/to-dashcase');
const Firestore = require('@google-cloud/firestore');

const config = require('../config.json');
const db = new Firestore(config.firestore);

// exports.init = async () => {
(async function importData() {
  // YYYY-MM-DD
  const date = new Date('2020-03-17').toISOString().split('T')[0];
  const data = require(`./data/old/${date}.json`);
  const update = await updateDatabase(data, date).catch(console.error);

  console.log(`Updated ${update.length} documents`);
})();

async function updateDatabase(data, date) {
  const collection = db.collection(config.firestore.collectionId);
  let writeBatch = db.batch();

  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    writeBatch.set(
      doc,
      { cases: { [date]: parseInt(d.count) }},
      { merge: true }
    );
  });

  return writeBatch.commit();
}
