const toDashcase = require('../lib/to-dashcase');
const Firestore = require('@google-cloud/firestore');

const data = require('./data/landkreise.json');
const config = require('../config.json');
const db = new Firestore(config.firestore);

(async function importCounties() {
  const collection = db.collection(config.firestore.collectionId);
  let writeBatch = db.batch();

  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    writeBatch.set(doc, d);
  });

  writeBatch.commit().then(res => {
    console.log(`Imported ${res.length} documents`);
  });
})();
