const { Firestore, FieldPath, Timestamp } = require('@google-cloud/firestore');

const config = require('./config.json');
const db = new Firestore(config.firestore);
const collection = db.collection(config.firestore.collectionId);


    // d.count = d.cases[dateString];
    // d.date = dateString;
    // d['last-updated'] = toDateString(d['last-updated']);
    // delete d['cases'];
    // return d;

    // const { a, ...noA } = myObject;



(async function init() {
  // const snapshot = await collection
  //   .doc('aichach-friedberg')
  //   .withConverter(dateConverter)
  //   .get();
  // const json = snapshot.data();

  const dateString = '2020-03-12';
  const fieldPath = new FieldPath('cases', dateString);
  const snapshot = await collection
    .withConverter(flatConverter(dateString))
    .where(fieldPath, '>', 0)
    .get();
  const json = snapshot.docs.map(doc => doc.data());

  console.log(json);
})();

function toDateString(obj) {
  const {_seconds, _nanoseconds} = obj;
  const timestamp = new Timestamp(_seconds, _nanoseconds);
  const dateString = timestamp.toDate().toISOString();

  return dateString;
}
