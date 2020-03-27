# Corona in Bayern (Scraper/API)

Die Zahl der Menschen, welche sich mit dem neuartigen Coronavirus SARS-CoV-2 infiziert haben, ist ein wichtiger Indikator für die Ausbreitung der Krankheit COVID-19. Die ungefähre Zahl der infizierten Menschen lässt sich jedoch nur mit Tests bestimmen. Da es sich um eine meldepflichtige Krankheit meldet, müssen positive Testergebnisse an die örtlichen Gesundheitsämter gemeldet werden, welche die Zahl der infizierten Personen an das jeweilige Landesamt weitermelden. Das Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit, kurz LGL, veröffentlicht jeden Tag die aktuellen Fallzahlen für Bayern.

Dieses Skript schreibt in regelmäßigen Abständen die aktuellen Zahlen von der Webseite des LGL in eine Datenbank und stellt eine Schnittstelle (API) zum Abfragen der Daten bereit.

## Daten

Eine Übersicht der aktuellen Statistiken zu Coronavirusinfektionen in Bayern findet sich auf der Webseite des **Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit**: <https://www.lgl.bayern.de/gesundheit/infektionsschutz/infektionskrankheiten_a_z/coronavirus/karte_coronavirus/index.htm>

Die absoluten Fallzahlen werden aus der „Tabelle 03: Coronavirusinfektionen“ bezogen. Das LGL aktualisiert diese Zahlen jeden Tag, meistens zwischen 12 und 15 Uhr.

## API

<https://europe-west3-brdata-corona.cloudfunctions.net/lglApi/>

### Endpunkte

- `/`: alle verfügbaren Daten abrufen
- `/date`: aktuellste Daten für alle Landkreise abrufen
- `/date/[date]`: Daten für ein spezifische Datum für alle Landkreise abrufen, z.B. `2020-03-18`
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
- `last-updated`: Datum der letzten Aktualisierung, z.B. "2020-03-25T19:09:05.188Z"
- `cases`: Alle bisher erfassten Fallzahlen pro Datum für Anfragen ohne `/date`-Parameter. Beispiel: { "2020-03-25": 43, "2020-03-24": 35, "2020-03-23": 18, ... }

### IDs für Landkreise und Städte

Jeder Stadt und jeder Landkreis haben einen eigene ID. Die IDs werden aus Namen des LGL `name-lgl` und der Methode `toDashcase(string)` aus `./lib/to-dashcase` erzeugt. Dieses Vorgehen hilft dabei die IDs stabil zu halten, auch wenn es kleiner Änderungen (Leerzeichen, Punkte) in der Benennung seitens des LGLs gibt.

Beispiel:

```javascript
toDashcase('Neumarkt i.d.Opf.') // => neumarkt-idopf

```

Ein vollständige Liste der IDs findet sich in der Datei `./import/data/counties.json`.

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
$ gcloud services enable firestore.googleapis.com
```

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

### Lokale Entwicklungsumgebung

```console
$ npm i -g @google-cloud/functions-framework
```

```console
$ functions-framework --target=lglApi
```

```console
$ curl -X GET 'localhost:8080?date=2020-03-18'
```

### Scraper deployen


```console
$ gcloud services enable cloudfunctions.googleapis.com
```

```console
$ gcloud config set functions/region europe-west3
```

```console
$ gcloud pubsub topics create lgl-scraper-start
```

```console
$ gcloud functions deploy lglScraper --runtime nodejs10 --trigger-topic lgl-scraper-start
```

```console
Allow unauthenticated invocations of new function [lglScraper]? (y/N)?
```

```console
$ gcloud alpha functions add-iam-policy-binding lglScraper --member=allUsers --role=roles/cloudfunctions.invoker
```

```console
$ gcloud services enable cloudscheduler.googleapis.com
```

```console
$ gcloud scheduler jobs create pubsub corona-scaper --topic=lgl-scraper-start --schedule="0 8-20/2 * * *" --time-zone="Europe/Brussels" --message-body="undefined"
```

### API deployen

```console
$ gcloud functions deploy lglApi --runtime nodejs10 --trigger-http --allow-unauthenticated
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
