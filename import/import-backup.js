const toDashcase = require('../lib/to-dashcase');
const Firestore = require('@google-cloud/firestore');

const data = require('./data/backup-20201019.json');
const config = require('../config.json');
const db = new Firestore(Object.assign(
  config.firestore,
  { keyFilename: '../key.json' }
));

(async function importCounties() {
  
  const collection = db.collection(config.firestore.collectionId);
  const writeBatch = db.batch();

  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    writeBatch.update(doc, d);
  });

  writeBatch.commit().then(res => {
    console.log(`Imported ${res.length} documents`);
  });
})();
