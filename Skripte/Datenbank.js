const SQLite = require('sqlite3');

/**
 * Die Datenbank mit allen Tabellen rund um das Wichteln.
 */
var DatenbankWichteln = null;
/**
 * Die Datenbank mit einer Tabelle als Zugriffslog auf den Bot.
 */
var DatenbankLog = null;

/**
 * Initialisiert die Datenbankverbindungen.
 */
exports.Initialisieren = function ()
{
    DatenbankWichteln = VerbindeMitDatenbank('Wichteln');
    DatenbankLog = VerbindeMitDatenbank('Log');
};

/**
 * Schließt alle Datenbankverbindungen.
 */
exports.Schließen = function ()
{
    try
    {
        DatenbankWichteln.close();
        DatenbankLog.close();
    }
    catch (Fehler)
    {
        console.error(Fehler);
    }
};

/**
 * Speichert einen Nutzer in der Datenbank.
 * @param {Object} Nutzer Das Nutzerobjekt mit allen Angaben zum Nutzer.
 */
exports.NutzerSpeichern = function (Nutzer)
{
    Nutzer.Zeit = AktuelleUnixzeit();

    //Nutzer in der Datenbank abspeichern:
    DatenbankWichteln.run(
        'INSERT INTO Nutzer (Id, Discord, Name, Nickname, Zeit, Zustand) VALUES (?, ?, ?, ?, ?, ?)',
        Nutzer.Id,
        Nutzer.Discord,
        Nutzer.Name,
        Nutzer.Nickname,
        Nutzer.Zeit,
        Nutzer.Zustand,
        Fehlerbehandlung
    );

    //Leere Nutzerdaten in der Tabelle anlegen:
    DatenbankWichteln.run(
        'INSERT INTO Informationen (NutzerId, Zeit) VALUES (?, ?)',
        Nutzer.Id,
        AktuelleUnixzeit(),
        Fehlerbehandlung
    );
};

/**
 * Aktualisiert einen Nutzer in der Datenbank.
 * @param {Object} Nutzer Das Nutzerobjekt mit allen Angaben zum Nutzer.
 */
exports.NutzerAktualisieren = function (Nutzer)
{
    Nutzer.Zeit = AktuelleUnixzeit();

    //Nutzer aktualisieren:
    DatenbankWichteln.run(
        'UPDATE Nutzer SET Discord = ?, Name = ?, Nickname = ?, Zeit = ?, Zustand = ? WHERE Id = ?',
        Nutzer.Discord,
        Nutzer.Name,
        Nutzer.Nickname,
        Nutzer.Zeit,
        Nutzer.Zustand,
        Nutzer.Id,
        Fehlerbehandlung
    );

    //Nutzerdaten zum Wichteln aktualisieren:
    DatenbankWichteln.run(
        `UPDATE Informationen SET
            Zeit = ?, AnalogDigitalSelbst = ?, AnalogDigitalWichtel = ?, Anschrift = ?, Land = ?, Steam = ?, International = ?,
            Wunschliste = ?, Allergien = ?, AusschlussGeschenk = ?, AusschlussWichtel = ?, Freitext = ?
        WHERE NutzerId = ?`,
        AktuelleUnixzeit(),
        Nutzer.AnalogDigitalSelbst,
        Nutzer.AnalogDigitalWichtel,
        Nutzer.Anschrift,
        Nutzer.Land,
        Nutzer.Steam,
        Nutzer.International,
        Nutzer.Wunschliste,
        Nutzer.Allergien,
        Nutzer.AusschlussGeschenk,
        Nutzer.AusschlussWichtel,
        Nutzer.Freitext,
        Nutzer.Id,
        Fehlerbehandlung
    );
};

/**
 * Lädt einen Nutzer aus der Datenbank.
 * @param {Number} NutzerId Die Discord-ID des Nutzers.
 * @param {Function} Callback Callback, der nach dem Laden des Nutzers ausgeführt wird. Parameter: {Object} Reihe.
 */
exports.NutzerLaden = function (NutzerId, Callback)
{
    DatenbankWichteln.get(
        'SELECT * FROM Nutzer WHERE Id = ?',
        NutzerId,
        function (Fehler, Reihe)
        {
            Fehlerbehandlung(Fehler);
            Callback(Reihe);
        }
    );
};

/**
 * Lädt alle Nutzer aus der Datenbank.
 * @param {Function} Callback Callback, der für jeden gefundenen Nutzer ausgeführt wird. Parameter: {Object} Reihe.
 */
exports.AlleNutzerLaden = function (Callback)
{
    DatenbankWichteln.each(
        `SELECT * FROM Nutzer
         LEFT JOIN Informationen ON Nutzer.Id = Informationen.NutzerId`,
        function (Fehler, Reihe)
        {
            Fehlerbehandlung(Fehler);
            Callback(Reihe);
        }
    );
};

/**
 * Ermittelt die relevanten Nutzerzahlen: Gesamtzahl, Teilnehmer; abzüglich Mods.
 * @param {Function} Callback Callback, der nach dem Erhalt des Ergebnisses ausgeführt wird. Parameter: {Object} Reihe.
 */
exports.Nutzerzahlen = function (Callback)
{
    DatenbankWichteln.get(
        `SELECT
            COUNT(*) AS Gesamt,
            SUM(CASE WHEN Zustand = 'Teilnehmer' THEN 1 ELSE 0 END) AS Teilnehmer
        FROM Nutzer
        WHERE Id NOT IN (SELECT NutzerId FROM Mods)`,
        function (Fehler, Reihe)
        {
            Fehlerbehandlung(Fehler);
            Callback(Reihe);
        }
    );
};

/**
 * Liest alle eingetragenen Ausschlüsse aus der Datenbank.
 * @param {Number} NutzerId Die Discord-ID des Nutzers.
 * @param {Function} Callback Callback, der nach dem Laden der Ausschlüsse ausgeführt wird. Parameter: {Array} Ausschlusswichtel.
 */
exports.Ausschlüsse = function (NutzerId, Callback)
{
    DatenbankWichteln.all(
        'SELECT * FROM Ausschluesse WHERE NutzerId = ? ORDER BY Zeit',
        NutzerId,
        function (Fehler, Reihen)
        {
            Fehlerbehandlung(Fehler);

            if (Fehler)
                Reihen = [];

            Callback(Reihen);
        }
    );
};

/**
 * Liest alle Steamnamen aus der Datenbank.
 * @param {Function} Callback Callback, der nach dem Laden der Ausschlüsse ausgeführt wird. Parameter: {Array} Ausschlusswichtel.
 */
exports.Steamnamen = function (Callback)
{
    DatenbankWichteln.all(
        "SELECT Steam FROM Informationen WHERE AnalogDigitalSelbst != 'analog'",
        function (Fehler, Reihen)
        {
            Fehlerbehandlung(Fehler);

            Callback(Reihen);
        }
    );
};

/**
 * Trägt eine Liste an Nutzer-Wichtel-Zuordnungen in die Datenbank ein.
 * @param {Array} Zuordnungen Eine Liste von Objekten mit .Nutzer.Id und .Wichtel.Id.
 * @param {Function} Callback Callback, der nach dem Eintragen der Wichtel ausgeführt wird.
 */
exports.WichtelEintragen = function (Zuordnungen, Callback)
{
    let Transaktion = NeueTransaktion(DatenbankWichteln.Name);

    let Vorgang = Transaktion.prepare("INSERT INTO Wichtel (NutzerId, WichtelId) VALUES (?, ?)", Transaktion.Fehlerbehandlung);

    for (let Zuordnung of Zuordnungen)
        Vorgang.run(Zuordnung.Nutzer.Id, Zuordnung.Wichtel.Id, Transaktion.Fehlerbehandlung);

    Vorgang.finalize(function ()
        {
            Transaktion.Schließen();
            Callback();
        }
    );
};

/**
 * Loggt die Eingabe eines Nutzers.
 * @param {Number} NutzerId Die Discord-ID des Nutzers.
 * @param {String} Name Der Discordname des Nutzers.
 * @param {String} Eingabe Die Eingabe des Nutzers.
 * @param {String} KanalId OPTIONAL Die Id des Kanals. Wenn eine direkte Nachricht, dann undefined.
 */
exports.Log = function (NutzerId, Name, Eingabe, KanalId)
{
    DatenbankLog.run(
        'INSERT INTO Log (NutzerId, Name, KanalId, Eingabe, Zeit) VALUES (?, ?, ?, ?, ?)',
        NutzerId,
        Name,
        KanalId,
        Eingabe,
        AktuelleUnixzeit()
    );
};

/**
 * Erzeugt eine neue Datenbankverbindung.
 * @param {String} Name Name der Datenbankdatei.
 * @returns {Object} Das Objekt der Datenbankverbindung.
 */
function VerbindeMitDatenbank (Name)
{
    let Datenbank = new SQLite.Database('./Daten/' + Name + '.sqlite', SQLite.OPEN_READWRITE, (Fehler) =>
        {
            if (Fehler) console.error(Fehler);
        }
    );

    //Versetzt die Datenbank in den seriellen Modus, sodass Datenbankabfragen immer nacheinander abgearbeitet werden anstatt gleichzeitig:
    Datenbank.serialize();

    Datenbank.Name = Name;

    return Datenbank;
}

/**
 * Erzeugt eine neue Transaktion.
 * @param {String} Name Name der Datenbankdatei.
 * @returns {Object} Das Objekt der Transaktion.
 */
function NeueTransaktion (Name)
{
    let Transaktion = VerbindeMitDatenbank(Name);

    Transaktion.Fehlersammlung = false;

    Transaktion.Fehlerbehandlung = function (Fehler)
    {
        Transaktion.Fehlersammlung = Transaktion.Fehlersammlung && Fehler;
        Fehlerbehandlung(Fehler);
    };

    Transaktion.Schließen = function ()
    {
        if (Transaktion.Fehlersammlung)
            Transaktion.run('ROLLBACK;');
        else
            Transaktion.run('COMMIT;');

        Transaktion.close();
    };

    Transaktion.run('BEGIN;');

    return Transaktion;
}

/**
 * Behandelt auftretende Fehler.
 * @param {String} Fehler Der Fehlertext, den die Datenbank zurückgibt.
 */
function Fehlerbehandlung (Fehler)
{
    if (Fehler)
        console.error(Fehler);
}

/**
 * Gibt die aktuelle Unixzeit zurück.
 * @returns {Number} Die aktuelle Unixzeit in Sekunden.
 */
function AktuelleUnixzeit ()
{
    return Math.floor(new Date() / 1000);
}