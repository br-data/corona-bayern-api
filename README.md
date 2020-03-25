# Corona Bayern start-scraper

Die Zahl der Menschen, welche sich mit dem neuartigen Coronavirus SARS-CoV-2 infiziert haben, ist ein wichtiger Indikator für die Ausbreitung der Krankheit COVID-19. Die ungefähre Zahl der infizierten Menschen lässt sich jedoch nur mit Tests bestimmen. Da es sich um eine meldepflichtige Krankheit meldet, müssen positive Testergebnisse an die örtlichen Gesundheitsämter gemeldet werden, welche die Zahl der infizierten Personen an das jeweilige Landesamt weitermelden. Das Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit, kurz LGL, veröffentlicht jeden Tag die aktuellen Fallzahlen für Bayern.

Dieses Skript schreibt in regelmäßigen Abständen die aktuellen Zahlen von der Webseite des LGL in eine Datenbank und stellt eine Schnittstelle (API) zum Abfragen der Daten bereit.

## Daten

Eine Übersicht der aktuellen Statistiken zu Coronavirusinfektionen in Bayern findet sich auf der Webseite des *Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit*: <https://www.lgl.bayern.de/gesundheit/infektionsschutz/infektionskrankheiten_a_z/coronavirus/karte_coronavirus/index.htm>

Die absoluten Fallzahlen werden aus der **Tabelle 03: Coronavirusinfektionen** bezogen. Das LGL aktualisiert diese Zahlen jeden Tag, meistens zwischen 12 und 15 Uhr.

## API

#### Endpunkte

- `/`: alle verfügbaren Daten abrufen
- `/date`: aktuellste Daten für alle Landkreise abrufen
- `/date/[date]`: Daten für ein spezifische Datum für alle Landkreise abrufen, z.B. `2020-03-18`
- `/county`: Daten für alle Landkreise abrufen
- `/county/[id]`: Daten für einen Landkreis abrufen, z.B. `amberg-sulzbach`

#### Parameter

- `?filetype=csv`: Daten als CSV-Tabelle zurückgeben

## Verwendung

Diese Anleitung geht davon aus, dass du bereits ein Google Cloud-Konto und ein Rechnungskonto dafür eingericht hast. Außerdem solltest du das Google Cloud-Kommandzeilenwerkzeug [installiert](https://cloud.google.com/sdk/install) und mit deinem Benutzerkonto [verknüpft](https://cloud.google.com/sdk/docs/initializing) haben.

### Projekt anlegen

```console
$ gcloud projects create corona-scaper
```

```console
$ gcloud config set project corona-scaper
```

### Firebase Datenbank erstellen

Verwende die Google Cloud-Weboberfläche, um eine neue Firebase-Datenbank zu erstellen: https://console.cloud.google.com/firestore/

Für die Datenbank sollte dabei der „native Modus“ ausgewählt werden. Als Region, also den Speicheort wählen wir `europe-west3` (Frankfurt) aus. Jede Datenbank kann mehrere Sammlungen (collections) enthalten, in der die einzelnen Daten als sogenannten Dokumente gespeichert werden können. Jetzt musst du nur noch eine neue Sammlung anlegen und benennen, zum Beispiel `bayern-lgl`.

In Zukunft wird das Erstellen einer Firebase-Datenbank auch über die Kommandozeile möglich sein:

```console
$ gcloud alpha firestore databases create --region=europe-west3
```

### Dienstkontoschlüssel für Firestore erstellen

Der externe Zugriff auf die Datenbank, zum Beispiel vom eigenen Computer, erfolgt über einen sogenanntes Dienstkonto (service account). Damit du dich mit dem Dienstkonto anzumelden kannst, musst du zuerst noch einen Dienstkontoschlüssel erstellen:

```console
$ gcloud iam service-accounts keys create ~/key.json \
      --iam-account corona.iam.gserviceaccount.com
```

Dabei ist `corona` die Projekt-ID. Das Ausführen des Befehls erzeugt eine Datei `key.json`, welche einen privaten Schlüssel erhält, der den Zugang zur Datenbank von extern ermöglicht. Diese Datei sollte geheim gehalten werden und darf niemals in Git eingecheckt werden.

### Konfiguration erstellen

Nachdem du die Datenbank, Sammlung und das Dienstkontoschlüssel erstellt hast, musst du diese Information noch in die Konfigurationsdatei `config.json` übertragen:

```json
{
  "url": "https://www.lgl.bayern.de/gesundheit/infektionsschutz/infektionskrankheiten_a_z/coronavirus/karte_coronavirus/index.htm",
  "firestore": {
    "projectId": "corona",
    "collectionId": "bayern-lgl",
    "timestampsInSnapshots": true,
    "keyFilename": "./key.json"
  }
}
```

### Lokale Entwicklungsumgebung

```console
$ npm i -g @google-cloud/functions-framework
```

```console
$ functions-framework --target=api
```

```console
$ curl -X GET 'localhost:8080?date=2020-03-18'
```

### Scraper deployen

```console
$ gcloud config set functions/region europe-west3
```

```console
$ gcloud pubsub topics create scraper-start
```

```console
$ gcloud functions deploy scaper --runtime nodejs10 --trigger-topic scraper-start
```

```console
$ gcloud scheduler jobs create pubsub corona-scaper --topic=scraper-start --schedule="0 8-20/2 * * 1-5" --time-zone="Europe/Brussels" --message-body="undefined"
```

### API deployen

```console
$ gcloud functions deploy api --runtime nodejs10 --trigger-http GET --allow-unauthenticated
```

## To Do

- Fälle pro 1.000 Einwohner hinzufügen
- Daten den gestrigen Tags zurückgeben, falls keine Daten für den heutige Tag verfügbar sind,
- Amtliche Gemeindeschlüssel (AGS) für Landkreise und kreisfreie Städte hinzufügen
- Dokumenten-ID den Landkreise und kreisfreie Städte hinzufügen ({id: amberg-sulzbach})
