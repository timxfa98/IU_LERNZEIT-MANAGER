# IU Lernzeit-Manager

Web-Anwendung zur Lernzeitplanung, Nachverfolgung und Zielerreichung für
berufsbegleitende Studierende der IU Internationale Hochschule.

Lernzeiten werden über sechs Monate und einzelne Monate geplant, mit einer
Stoppuhr gemessen und anschließend ausgewertet. Die gemessene Zeit fließt
automatisch in beide Planungsebenen ein.

## Live-Demo

**https://main.d3emxtse1c7rip.amplifyapp.com/**

Der Zugang ist durch eine Anmeldung geschützt. Konten legt ausschließlich eine
Person mit Administrationsrechten in der Anwendung an – eine Selbstregistrierung
gibt es bewusst nicht.

Die vollständige Dokumentation liegt im Ordner [Dokumentation](Dokumentation/).

## Hosting

Die Anwendung läuft vollständig in AWS und wird über AWS Amplify Hosting
bereitgestellt. Jeder Push auf `main` baut und deployt Frontend und Backend
automatisch.
