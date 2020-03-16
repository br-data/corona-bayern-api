const toDashcase = require('./to-dashcase');
const Firestore = require('@google-cloud/firestore');

const config = require('./config.json');
const data = require('./data/landkreise.json');

const firestore = new Firestore(config.firestore);

(async function importData() {
  const collection = firestore.collection(config.firestore.collectionId);
  let writeBatch = firestore.batch();
  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    d.cases = [];
    writeBatch.set(doc, d);
  });

  writeBatch.commit().then(res => {
    console.log(`Imported ${res.length} documents`);
  });
})();
