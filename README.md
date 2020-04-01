# Corona in Bayern (Scraper/API)

Die Zahl der Menschen, welche sich mit dem neuartigen Coronavirus SARS-CoV-2 infiziert haben, ist ein wichtiger Indikator für die Ausbreitung von COVID-19.
Krankenhäuser und Ärzte sind dazu verpflichtet Corona-Fälle an die örtlichen Gesundheitsämter zu melden. Aus der Summe dieser Meldungen ergeben sich die offiziellen Fallzahlen. In Bayern werden die aktuellen Fallzahlen durch das Bayerische Landesamt für Gesundheit und Lebensmittelsicherheit veröffentlicht.

Die hier veröffentlichten Skripte dienen dazu die veröffentlichen Zahlen des LGL täglich in einer Datenbank zu sichern und eine Schnittstelle (API) zum Abfragen der Daten bereitzustellen.

## Daten

Eine Übersicht der aktuellen Statistiken zu Coronavirusinfektionen in Bayern findet sich auf der Webseite des **Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit** (LGL). Das LGL aktualisiert diese Seite jeden Tag, meistens zwischen 12 und 15 Uhr: <https://www.lgl.bayern.de/gesundheit/infektionsschutz/infektionskrankheiten_a_z/coronavirus/karte_coronavirus/index.htm>

Die absoluten Fallzahlen werden aus der „Tabelle 03: Coronavirusinfektionen“ bezogen.

### Einschränkungen

Die Daten werden von uns mehrfach täglich in eine Datenbank geschrieben. Dabei sind aber folgende Einschränkungen zu beachten:

- Für die Landkreise sind keine Zahlen vor dem 12.3.2020 verfügbar.
- Für die Landkreise werden seitens des LGL keine Nachmeldungen (Stichwort: Meldeverzögerung) veröffentlicht. Daher können die historischen Zahlen von den Zahlen des RKIs abweichen.
- Unklare Datenlage vor dem 20.3.2020: Tagesweise gehen die Fallzahlen in einzelnen Landkreise wieder zurück, was eigentlich nicht sein kann.
- Die Zahl der Todesfälle ist erst ab 28.3.2020 verfügbar. Momentan erfassen wir jeweils nur die letzte Zählung.

## API

Für die Verwendung der Daten in Apps und interaktiven Grafiken (Datawrapper) stellen wir einen API bereit, die das Abfragen der LGL-Daten nach bestimmten Parametern (Zeitpunkt, Landkreis, Dateiformat) ermöglicht.

**URL:** <https://europe-west3-brdata-corona.cloudfunctions.net/lglApi/>

### Endpunkte

- `/`: alle verfügbaren Daten abrufen
- `/date`: aktuellste Daten abrufen
- `/date/[date]`: Daten für ein spezifische Datum abrufen, z.B. `2020-03-18`
- `/county`: Daten für alle Landkreise abrufen
- `/county/[id]`: Daten für einen Landkreis abrufen, z.B. `amberg-sulzbach`

### Parameter

- `?filetype=csv`: Daten als CSV-Tabelle zurückgeben

### Felder

- `name-lgl`: offizielle Bezeichnung des LGLs, z.B. "Neumarkt i.d.Opf."
- `name`: ausgeschriebener Name, z.B. "Neumarkt in der Oberpfalz"
- `type`: "Stadt" oder "Landkreis"
- `lat`: Längengrad, z.B. 49.2265324
- `long`: Breitengrat, z.B. 11.5580180
- `pop`: Einwohnerzahl, z.B. 1471508
- `date`: Datum für `/date`-Anfragen, z.B."2020-03-24"
- `count`: Fallzahlen für `/date`-Anfragen, z.B. 35
- `last-count`: letzte erfasste Fallzahlen, z.B. 43
- `last-count-per-tsd`: letzte berechnete Fallzahlen pro 1.000 Einwohner, z.B. 0.13
- `last-deaths`: letzte erfasste Todefälle, z.B. 2
- `last-updated`: Datum der letzten Aktualisierung, z.B. "2020-03-25T19:09:05.188Z"
- `cases`: Alle bisher erfassten Fallzahlen pro Datum für Anfragen ohne `/date`-Parameter. Beispiel: { "2020-03-25": 43, "2020-03-24": 35, "2020-03-23": 18, ... }

### IDs für Landkreise und Städte

Jeder Stadt und jeder Landkreis haben einen eigene ID. Die IDs werden aus Namen des LGL `name-lgl` und der Methode `toDashcase(string)` aus `./lib/to-dashcase` erzeugt. Dieses Vorgehen hilft dabei die IDs stabil zu halten, auch wenn es kleiner Änderungen (Leerzeichen, Punkte) in der Benennung seitens des LGLs gibt.

Beispiel:

```javascript
toDashcase('Neumarkt i.d.Opf.') // => neumarkt-idopf

```

Ein vollständige Liste der IDs findet sich in der Datei `./import/data/counties.json`.

## Beispiele

### 1. Anfrage an `/date/[date]`

Bei Anfragen für ein bestimmtes Datum wird kein `case`-Objekt mit Fallzahlen für andere Daten zurückgegeben. Die Rückgabe-Objekt für den Endpunkt `/date` sind identisch, nur das hierbei immer die jeweils aktuellsten Daten von heute oder gestern zurückgegeben werden.

Beispiel für `/date/2020-03-25`:

```javascript
[
  {
    "name-lgl": "Ansbach Stadt",
    "name": "Ansbach",
    "type": "Stadt",
    "lat": 49.2917917440462,
    "long": 10.5691214101633,
    "pop": 41847,
    "date": "2020-03-25",
    "count": 6,
    "last-count": 24,
    "last-count-per-tsd": 0.14,
    "last-deaths": 43,
    "last-updated": "2020-03-31T18:00:05.119Z"
  },
  {
    // ... andere Landkreise
  }
]
```

### 2. Anfrage an `/county/[county]`

Bei Anfragen für einen bestimmten Landkreis, werden alle Fallzahlen für jeden verfügbaren Tag im `case`-Objekt zurückgegeben. Die Rückgabe-Objekte für die Endpunkte `/county` und `/` sind identisch. Hier werden jeweils alle verfügbaren Daten für alle Landkreise zurückgegeben.

Beispiel für `/county/ansbach-stadt`:

```javascript
[
  {
    "name-lgl": "Ansbach Stadt",
    "name": "Ansbach",
    "type": "Stadt",
    "lat": 49.2917917440462,
    "long": 10.5691214101633,
    "pop": 41847,
    "last-count": 24,
    "last-deaths": 43,
    "last-updated": "2020-03-31T18:00:05.119Z",
    "cases": {
      "2020-03-31": 24,
      "2020-03-30": 19,
      "2020-03-29": 24,
      "2020-03-28": 18,
      "2020-03-27": 15,
      "2020-03-26": 10
      // ... mehr Fallzahlen
    }
  }
]
```

## Verwendung

Diese Anleitung geht davon aus, dass bereits ein Google Cloud-Konto vorhanden und ein Rechnungskonto eingerichtet ist. Außerdem sollte das Google Cloud-Kommandzeilenwerkzeug [installiert](https://cloud.google.com/sdk/install) und mit einem Benutzerkonto [verknüpft](https://cloud.google.com/sdk/docs/initializing) sein.

### Projekt anlegen

Neues Projekt mit der ID `brdata-corona` erstellen. Der Parameter `--name` ist optional.

```console
$ gcloud projects create brdata-corona --name=30-BRData-corona
```

Das Projekt als aktuelles Arbeitsprojekt festlegen:

```console
$ gcloud config set project brdata-corona
```

### Firebase Datenbank erstellen

Verwende die [Google Cloud-Weboberfläche](https://console.cloud.google.com/firestore/), um eine neue Firebase-Datenbank zu erstellen:

Für die Datenbank sollte dabei der „native Modus“ ausgewählt werden. Als Region, also den Speicheort wählen wir `europe-west3` (Frankfurt) aus. Jede Datenbank kann mehrere Sammlungen (collections) enthalten, in der die einzelnen Daten als sogenannten Dokumente gespeichert werden können. Jetzt musst du nur noch eine neue Sammlung anlegen und benennen, zum Beispiel `bayern-lgl`.

In Zukunft wird das Erstellen einer Firebase-Datenbank auch über die Kommandozeile möglich sein:

Firestore-API aktivieren:

```console
$ gcloud services enable firestore.googleapis.com
```

Neue Datenbank im Rechenzentrum *europe-west3* (Frankfurt) anlegen:

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

### Daten importieren

**Achtung:** Überschreibt alle bisherigen Daten in der Datenbank! Basisdatensatz aller Landkreise mit Geodaten (Lat/Long) importieren:

```console
$ node import-counties.js ./data/counties.json
```

Fehlende Daten für einzelne Tage importieren:

```console
$ node import/import-daily.js ./data/daily/2020-03-15.json
```

### Scraper deployen

Google Cloud Function für das aktuelle Projekt aktivieren:

```console
$ gcloud services enable cloudfunctions.googleapis.com
```

Rechenzentrum *europe-west3* (Frankfurt) als Ziel für das Funktions-Deployment festlegen. Das gewählte Rechenzentrum muss identisch sein, mit dem Rechenzentrum für die Firestore-Datenbank:

```console
$ gcloud config set functions/region europe-west3
```

Neues Pub/Sub-Thema *lgl-scraper-start* erstellen, welches die Scraper-Funktion auslöst:

```console
$ gcloud pubsub topics create lgl-scraper-start
```

Scraper-Funktion deployen und den Pub/Sub-Auslöser *lgl-scraper-start* festlegen

```console
$ gcloud functions deploy lglScraper --runtime nodejs10 --trigger-topic lgl-scraper-start
```

Die Abfrage, ob auch eine authentifizierte Ausführung erlaubt werden soll, kann in dem meisten Fällen mit „Nein“ beantwortet werden, da die Funktion vom Google Cloud Scheduler zeitgesteuert ausgelöst werden kann.

```console
Allow unauthenticated invocations of new function [lglScraper]? (y/N)?
```

Falls man später doch eine nicht authentifizierte Ausführung erlauben möchte, muss man die entsprechende IAM-Richtline ändern:

```console
$ gcloud alpha functions add-iam-policy-binding lglScraper --member=allUsers --role=roles/cloudfunctions.invoker
```

## Scraper zeitgesteuert starten

Der Google Cloud Scheduler erlaubt es den Scraper zeitgesteuert, zu bestimmten Uhrzeiten, auszuführen. Dazu muss der Cloud Scheduler jedoch erstmal für das Projekt aktiviert werden:

```console
$ gcloud services enable cloudscheduler.googleapis.com
```

Wie häufig die Scraper-Funktion ausgeführt werden soll, kann mit dem Parameter `--schedule` festgelegt werden, welche die Crontab-Syntax unterstützt. Dabei hilft zum Beispiel der [crontab.guru](https://crontab.guru/). Außerdem muss die gültige Zeitzone `--time-zone` und der Pub/Sub-Auslöser `--topic` festgelegt werden. In diesem Beispiel wird der Scraper alle zwei Stunden von 8 bis 20 Uhr ausgeführt:

```console
$ gcloud scheduler jobs create pubsub brdata-corona --topic=lgl-scraper-start --schedule="0 8-20/2 * * *" --time-zone="Europe/Brussels" --message-body="undefined"
```

### API deployen

API-Funktion deployen. In diesem Beispiel wird der nicht authentifizierte Zugriff von außerhalb erlaubt, um den Datenaustausch zwischen API und beispielsweise einer Web-App zu ermöglichen:

```console
$ gcloud functions deploy lglApi --runtime nodejs10 --trigger-http --allow-unauthenticated
```

### Lokale Entwicklungsumgebung

Das Google Functions Framework global installieren, um Funktion lokal testen zu können;

```console
$ npm i -g @google-cloud/functions-framework
```

Funktion *lglApi* starten:

```console
$ functions-framework --target=lglApi
```

API-Anfrage an die aktivierte Funktion stellen (Beispiel):

```console
$ curl -X GET 'localhost:8080?date=2020-03-18'
```

## To Do

- Fälle pro 1.000 Einwohner für alle Endpunkte hinzufügen
- Verdopplungszeit (alle n Tage) hinzufügen
- Amtliche Gemeindeschlüssel (AGS) für Landkreise und kreisfreie Städte hinzufügen `{ "ags": "09371" }`
- Dokumenten-ID den Landkreise und kreisfreie Städte hinzufügen `{ "id": "amberg-sulzbach" }`
- Festlegen, wie viele Tage `getSpecificDate()` maximal zurückgehen darf
- Bessere Fehlerbehandlung und Reporting für die API
- Dynamischer Import oder `require()` von Modulen
- Scraper und API auf zwei Dateien aufteilen, wenn GCloud das erlaubt
