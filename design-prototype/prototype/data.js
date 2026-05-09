// Mock data for ACLI Gestionale prototype
window.ACLI_DATA = (function () {
  const bambini = [
    { id: "b1", nome: "Sofia", cognome: "Romano", classe: "3ª elementare", scuola: "Don Milani", attivo: true, genitore: "Marta Romano", telefono: "+39 348 5512311", iscrizione: "Doposcuola 14–18", saldo: 0, presenzeMese: 12, mesiAperti: 0, fasceOrarie: ["14-16", "16-18"], giorni: ["lun","mer","ven"], dataNascita: "2018-03-14", note: "Allergia alle nocciole." },
    { id: "b2", nome: "Matteo", cognome: "Bianchi", classe: "1ª media", scuola: "G. Bertinotti", attivo: true, genitore: "Giulia Bianchi", telefono: "+39 392 1144782", iscrizione: "Doposcuola 14–16", saldo: 60, presenzeMese: 9, mesiAperti: 1, fasceOrarie: ["14-16"], giorni: ["mar","gio"], dataNascita: "2014-11-02", note: "" },
    { id: "b3", nome: "Anna", cognome: "Ferrari", classe: "2ª elementare", scuola: "Don Milani", attivo: true, genitore: "Davide Ferrari", telefono: "+39 333 8845611", iscrizione: "Laboratorio teatro", saldo: 0, presenzeMese: 4, mesiAperti: 0, fasceOrarie: [], giorni: [], dataNascita: "2019-06-22", note: "Sorella di Lorenzo Ferrari." },
    { id: "b4", nome: "Lorenzo", cognome: "Ferrari", classe: "5ª elementare", scuola: "Don Milani", attivo: true, genitore: "Davide Ferrari", telefono: "+39 333 8845611", iscrizione: "Doposcuola 14–18", saldo: 110, presenzeMese: 11, mesiAperti: 2, fasceOrarie: ["14-16","16-18"], giorni: ["lun","mar","mer","gio","ven"], dataNascita: "2016-01-08", note: "" },
    { id: "b5", nome: "Giada", cognome: "Marini", classe: "4ª elementare", scuola: "A. Manzoni", attivo: true, genitore: "Sara Marini", telefono: "+39 347 6612099", iscrizione: "Doposcuola 14–16", saldo: 0, presenzeMese: 8, mesiAperti: 0, fasceOrarie: ["14-16"], giorni: ["lun","mer","ven"], dataNascita: "2017-05-19", note: "" },
    { id: "b6", nome: "Tommaso", cognome: "Greco", classe: "2ª media", scuola: "G. Bertinotti", attivo: true, genitore: "Elena Greco", telefono: "+39 320 1147722", iscrizione: "Doposcuola 14–16", saldo: 50, presenzeMese: 7, mesiAperti: 1, fasceOrarie: ["14-16"], giorni: ["mar","gio"], dataNascita: "2013-09-30", note: "" },
    { id: "b7", nome: "Sara", cognome: "Esposito", classe: "1ª elementare", scuola: "Don Milani", attivo: true, genitore: "Paolo Esposito", telefono: "+39 388 5611290", iscrizione: "Locomotiva", saldo: 0, presenzeMese: 14, mesiAperti: 0, fasceOrarie: [], giorni: ["lun","mar","mer","gio","ven"], dataNascita: "2020-02-11", note: "" },
    { id: "b8", nome: "Luca", cognome: "Conti", classe: "3ª media", scuola: "G. Bertinotti", attivo: false, genitore: "Anna Conti", telefono: "+39 391 4498211", iscrizione: "—", saldo: 0, presenzeMese: 0, mesiAperti: 0, fasceOrarie: [], giorni: [], dataNascita: "2012-07-04", note: "Trasferito a giugno." },
    { id: "b9", nome: "Caterina", cognome: "De Luca", classe: "2ª elementare", scuola: "A. Manzoni", attivo: true, genitore: "Marco De Luca", telefono: "+39 348 7711098", iscrizione: "Doposcuola 14–18", saldo: 0, presenzeMese: 13, mesiAperti: 0, fasceOrarie: ["14-16","16-18"], giorni: ["lun","mar","mer","gio","ven"], dataNascita: "2018-12-01", note: "" },
    { id: "b10", nome: "Filippo", cognome: "Russo", classe: "5ª elementare", scuola: "Don Milani", attivo: true, genitore: "Chiara Russo", telefono: "+39 351 9912240", iscrizione: "Laboratorio teatro", saldo: 30, presenzeMese: 3, mesiAperti: 1, fasceOrarie: [], giorni: [], dataNascita: "2016-04-25", note: "" },
    { id: "b11", nome: "Beatrice", cognome: "Moretti", classe: "1ª media", scuola: "G. Bertinotti", attivo: true, genitore: "Laura Moretti", telefono: "+39 366 8825110", iscrizione: "Doposcuola 14–16", saldo: 0, presenzeMese: 10, mesiAperti: 0, fasceOrarie: ["14-16"], giorni: ["lun","mer","ven"], dataNascita: "2014-08-17", note: "" },
    { id: "b12", nome: "Davide", cognome: "Gallo", classe: "4ª elementare", scuola: "A. Manzoni", attivo: true, genitore: "Marta Gallo", telefono: "+39 327 5544100", iscrizione: "Doposcuola 14–18", saldo: 0, presenzeMese: 12, mesiAperti: 0, fasceOrarie: ["14-16","16-18"], giorni: ["lun","mar","gio","ven"], dataNascita: "2017-10-09", note: "" },
  ];

  const attivita = [
    { id: "a1", nome: "Doposcuola 2025–26", tipo: "doposcuola", attivo: true, modalita: 2, sessioni: 10, iscritti: 32, frequenza: "5 giorni/sett", icon: "GraduationCap" },
    { id: "a2", nome: "Laboratorio teatro", tipo: "laboratorio", attivo: true, modalita: 1, sessioni: 8, iscritti: 14, frequenza: "Sabato", icon: "Drama" },
    { id: "a3", nome: "Locomotiva (centro estivo)", tipo: "locomotiva", attivo: false, modalita: 3, sessioni: 6, iscritti: 0, frequenza: "Settimanale", icon: "Train" },
    { id: "a4", nome: "Compiti di matematica", tipo: "laboratorio", attivo: true, modalita: 1, sessioni: 12, iscritti: 9, frequenza: "Martedì", icon: "Calculator" },
  ];

  const iscrizioni = [
    { id: "i1", bambino: "Sofia Romano", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–18 (5 gg)", importo: 110, mesi: { tot: 10, pagati: 8 }, stato: "in_corso" },
    { id: "i2", bambino: "Matteo Bianchi", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–16 (2 gg)", importo: 60, mesi: { tot: 10, pagati: 6 }, stato: "in_ritardo" },
    { id: "i3", bambino: "Lorenzo Ferrari", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–18 (5 gg)", importo: 110, mesi: { tot: 10, pagati: 5 }, stato: "in_ritardo" },
    { id: "i4", bambino: "Giada Marini", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–16 (3 gg)", importo: 80, mesi: { tot: 10, pagati: 8 }, stato: "in_corso" },
    { id: "i5", bambino: "Tommaso Greco", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–16 (2 gg)", importo: 60, mesi: { tot: 10, pagati: 7 }, stato: "in_corso" },
    { id: "i6", bambino: "Caterina De Luca", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–18 (5 gg)", importo: 110, mesi: { tot: 10, pagati: 8 }, stato: "in_corso" },
    { id: "i7", bambino: "Beatrice Moretti", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–16 (3 gg)", importo: 80, mesi: { tot: 10, pagati: 8 }, stato: "in_corso" },
    { id: "i8", bambino: "Davide Gallo", attivita: "Doposcuola 2025–26", modalita: "Mensile 14–18 (4 gg)", importo: 95, mesi: { tot: 10, pagati: 8 }, stato: "in_corso" },
    { id: "i9", bambino: "Anna Ferrari", attivita: "Laboratorio teatro", modalita: "Pacchetto 8 sessioni", importo: 80, mesi: { tot: 8, pagati: 8 }, stato: "completata" },
    { id: "i10", bambino: "Filippo Russo", attivita: "Laboratorio teatro", modalita: "Pacchetto 8 sessioni", importo: 80, mesi: { tot: 8, pagati: 5 }, stato: "in_ritardo" },
  ];

  // monthly schedule (rate)
  const rate = [
    { mese: "set 2025", importo: 110, stato: "pagato", data: "01/09/2025", mezzo: "BCC" },
    { mese: "ott 2025", importo: 110, stato: "pagato", data: "03/10/2025", mezzo: "Cassa" },
    { mese: "nov 2025", importo: 110, stato: "pagato", data: "04/11/2025", mezzo: "Sumup" },
    { mese: "dic 2025", importo: 110, stato: "pagato", data: "02/12/2025", mezzo: "BCC" },
    { mese: "gen 2026", importo: 110, stato: "pagato", data: "08/01/2026", mezzo: "Cassa" },
    { mese: "feb 2026", importo: 110, stato: "pagato", data: "03/02/2026", mezzo: "Cassa" },
    { mese: "mar 2026", importo: 110, stato: "pagato", data: "05/03/2026", mezzo: "BCC" },
    { mese: "apr 2026", importo: 110, stato: "pagato", data: "07/04/2026", mezzo: "Cassa" },
    { mese: "mag 2026", importo: 110, stato: "non_pagato", data: null, mezzo: null },
    { mese: "giu 2026", importo: 110, stato: "non_pagato", data: null, mezzo: null },
  ];

  const educatori = [
    { id: "e1", nome: "Marta", cognome: "Belli", email: "marta.belli@acli.it", telefono: "+39 348 5511220", attivo: true, gioxsett: 4, oremese: 48 },
    { id: "e2", nome: "Giorgio", cognome: "Antoni", email: "giorgio.antoni@acli.it", telefono: "+39 333 7766220", attivo: true, gioxsett: 3, oremese: 36 },
    { id: "e3", nome: "Lucia", cognome: "Pecchini", email: "lucia.pecchini@acli.it", telefono: "+39 391 4422990", attivo: true, gioxsett: 5, oremese: 60 },
    { id: "e4", nome: "Davide", cognome: "Vinci", email: "davide.vinci@acli.it", telefono: "+39 339 8821100", attivo: true, gioxsett: 2, oremese: 24 },
    { id: "e5", nome: "Sara", cognome: "Lupi", email: "sara.lupi@acli.it", telefono: "+39 347 1100442", attivo: false, gioxsett: 0, oremese: 0 },
  ];

  const movimenti = [
    { id: "m1", data: "07/05/2026", tipo: "Entrata", importo: 110, conto: "BCC", categoria: "Quote iscrizione", descrizione: "Quota maggio — Sofia Romano", volontario: "Sistema", stato: "valido" },
    { id: "m2", data: "07/05/2026", tipo: "Uscita", importo: 24.5, conto: "Cassa", categoria: "Cancelleria", descrizione: "Quaderni e penne per laboratorio", volontario: "Marta Belli", stato: "valido" },
    { id: "m3", data: "06/05/2026", tipo: "Entrata", importo: 60, conto: "Sumup", categoria: "Quote iscrizione", descrizione: "Quota mag — Matteo Bianchi", volontario: "Giorgio Antoni", stato: "valido" },
    { id: "m4", data: "06/05/2026", tipo: "Uscita", importo: 18, conto: "Cassa", categoria: "Merenda", descrizione: "Frutta e succhi", volontario: "Lucia Pecchini", stato: "valido" },
    { id: "m5", data: "05/05/2026", tipo: "Entrata", importo: 80, conto: "BCC", categoria: "Quote laboratorio", descrizione: "Laboratorio teatro — Anna Ferrari", volontario: "Sistema", stato: "valido" },
    { id: "m6", data: "05/05/2026", tipo: "Uscita", importo: 320, conto: "BCC", categoria: "Compensi educatori", descrizione: "Aprile — Marta Belli", volontario: "Sistema", stato: "valido" },
    { id: "m7", data: "04/05/2026", tipo: "Entrata", importo: 110, conto: "Cassa", categoria: "Quote iscrizione", descrizione: "Quota mag — Caterina De Luca", volontario: "Marta Belli", stato: "valido" },
    { id: "m8", data: "04/05/2026", tipo: "Uscita", importo: 47.8, conto: "Cassa", categoria: "Materiale didattico", descrizione: "Risme A4 + cartelline", volontario: "Marta Belli", stato: "errato" },
    { id: "m9", data: "04/05/2026", tipo: "Uscita", importo: 47.8, conto: "Cassa", categoria: "Materiale didattico", descrizione: "Correzione: 4.78 → 47.80", volontario: "Marta Belli", stato: "corretto" },
    { id: "m10", data: "03/05/2026", tipo: "Entrata", importo: 80, conto: "BCC", categoria: "Quote iscrizione", descrizione: "Quota mag — Giada Marini", volontario: "Sistema", stato: "valido" },
    { id: "m11", data: "03/05/2026", tipo: "Uscita", importo: 89.4, conto: "BCC", categoria: "Utenze", descrizione: "Bolletta luce aprile", volontario: "Sistema", stato: "valido" },
    { id: "m12", data: "02/05/2026", tipo: "Entrata", importo: 60, conto: "Sumup", categoria: "Quote iscrizione", descrizione: "Quota mag — Tommaso Greco", volontario: "Giorgio Antoni", stato: "valido" },
    { id: "m13", data: "02/05/2026", tipo: "Uscita", importo: 12.4, conto: "Cassa", categoria: "Merenda", descrizione: "Latte e biscotti", volontario: "Lucia Pecchini", stato: "valido" },
    { id: "m14", data: "01/05/2026", tipo: "Entrata", importo: 110, conto: "BCC", categoria: "Quote iscrizione", descrizione: "Quota mag — Beatrice Moretti", volontario: "Sistema", stato: "valido" },
  ];

  const utenti = [
    { id: "u1", nome: "Nicolò Patti", email: "nicolo@acli.it", ruolo: "admin", attivo: true, ultimoAccesso: "Oggi · 09:14" },
    { id: "u2", nome: "Marta Belli", email: "marta.belli@acli.it", ruolo: "admin", attivo: true, ultimoAccesso: "Ieri · 17:42" },
    { id: "u3", nome: "Giorgio Antoni", email: "giorgio.antoni@acli.it", ruolo: "volontario_cassa", attivo: true, ultimoAccesso: "Oggi · 14:08" },
    { id: "u4", nome: "Lucia Pecchini", email: "lucia.pecchini@acli.it", ruolo: "volontario_cassa", attivo: true, ultimoAccesso: "3 giorni fa" },
    { id: "u5", nome: "Davide Vinci", email: "davide.vinci@acli.it", ruolo: "volontario_cassa", attivo: false, ultimoAccesso: "Mai" },
  ];

  const presenzeOggi = [
    { bambino: "Sofia Romano", iscrizione: "Doposcuola 14–18", in: "14:05", out: "17:50", stato: "presente" },
    { bambino: "Matteo Bianchi", iscrizione: "Doposcuola 14–16", in: "14:08", out: "16:00", stato: "presente" },
    { bambino: "Lorenzo Ferrari", iscrizione: "Doposcuola 14–18", in: "14:02", out: null, stato: "presente" },
    { bambino: "Giada Marini", iscrizione: "Doposcuola 14–16", in: null, out: null, stato: "assente" },
    { bambino: "Tommaso Greco", iscrizione: "Doposcuola 14–16", in: "14:12", out: "16:05", stato: "presente" },
    { bambino: "Caterina De Luca", iscrizione: "Doposcuola 14–18", in: "14:00", out: null, stato: "presente" },
    { bambino: "Beatrice Moretti", iscrizione: "Doposcuola 14–16", in: "14:18", out: "16:00", stato: "presente" },
    { bambino: "Davide Gallo", iscrizione: "Doposcuola 14–18", in: null, out: null, stato: "assente_giustificato" },
  ];

  // Saldi conti
  const conti = {
    Cassa: { entrate: 1240.5, uscite: 482.4, saldo: 758.1 },
    BCC: { entrate: 4720.0, uscite: 2138.4, saldo: 8421.55 },
    Sumup: { entrate: 580.0, uscite: 0, saldo: 580.0 },
  };

  // Trend dei movimenti per ultimi 14 giorni
  const trend = [
    { d: "24/04", e: 60, u: 32 },
    { d: "25/04", e: 0, u: 12 },
    { d: "26/04", e: 110, u: 0 },
    { d: "27/04", e: 80, u: 18 },
    { d: "28/04", e: 0, u: 24 },
    { d: "29/04", e: 220, u: 47 },
    { d: "30/04", e: 110, u: 18 },
    { d: "01/05", e: 110, u: 0 },
    { d: "02/05", e: 60, u: 12 },
    { d: "03/05", e: 80, u: 89 },
    { d: "04/05", e: 110, u: 47 },
    { d: "05/05", e: 80, u: 320 },
    { d: "06/05", e: 60, u: 18 },
    { d: "07/05", e: 110, u: 24 },
  ];

  // Disponibilità educatori per maggio 2026
  const disponibilita = (() => {
    const days = [];
    const start = new Date(2026, 4, 1); // May 1 2026
    for (let i = 0; i < 31; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dow = d.getDay();
      // Closed weekends except some Saturdays
      const slotPattern =
        dow === 0 ? [] : dow === 6 ? (i % 14 === 0 ? ["14-16"] : []) : ["14-16", "16-18"];
      days.push({
        d,
        date: d.getDate(),
        dow,
        slots: slotPattern,
        copertura:
          slotPattern.length === 0 ? null : (i + dow) % 4 === 0 ? "scoperto" : "coperto",
      });
    }
    return days;
  })();

  const categorie = [
    { nome: "Quote iscrizione", tipo: "Entrata", n: 38 },
    { nome: "Quote laboratorio", tipo: "Entrata", n: 12 },
    { nome: "Donazioni", tipo: "Entrata", n: 4 },
    { nome: "Compensi educatori", tipo: "Uscita", n: 14 },
    { nome: "Materiale didattico", tipo: "Uscita", n: 22 },
    { nome: "Cancelleria", tipo: "Uscita", n: 11 },
    { nome: "Merenda", tipo: "Uscita", n: 18 },
    { nome: "Utenze", tipo: "Uscita", n: 6 },
  ];

  // === Amministrazione: Soci / Tesserati ===
  const soci = [
    { id: "s1", nome: "Patti Nicolò", tessera: "ACLI-2026-001", ruolo: "Presidente", iscrizione: "01/01/2018", quota: "pagata", quotaImporto: 30, contatto: "nicolo@acli.it", note: "Direttivo · Presidente" },
    { id: "s2", nome: "Belli Marta", tessera: "ACLI-2026-002", ruolo: "Vicepresidente", iscrizione: "01/01/2019", quota: "pagata", quotaImporto: 30, contatto: "marta.belli@acli.it", note: "Direttivo · Coordinamento educativo" },
    { id: "s3", nome: "Antoni Giorgio", tessera: "ACLI-2026-003", ruolo: "Tesoriere", iscrizione: "01/03/2017", quota: "pagata", quotaImporto: 30, contatto: "giorgio.antoni@acli.it", note: "Direttivo" },
    { id: "s4", nome: "Pecchini Lucia", tessera: "ACLI-2026-004", ruolo: "Segretaria", iscrizione: "01/01/2020", quota: "pagata", quotaImporto: 30, contatto: "lucia.pecchini@acli.it", note: "Direttivo" },
    { id: "s5", nome: "Vinci Davide", tessera: "ACLI-2026-005", ruolo: "Consigliere", iscrizione: "01/06/2021", quota: "pagata", quotaImporto: 30, contatto: "davide.vinci@acli.it", note: "Direttivo" },
    { id: "s6", nome: "Romano Marta", tessera: "ACLI-2026-018", ruolo: "Socio", iscrizione: "15/09/2024", quota: "pagata", quotaImporto: 15, contatto: "marta.romano@gmail.com", note: "Famiglia Sofia" },
    { id: "s7", nome: "Bianchi Giulia", tessera: "ACLI-2026-019", ruolo: "Socio", iscrizione: "20/09/2024", quota: "scaduta", quotaImporto: 15, contatto: "giulia.bianchi@gmail.com", note: "Famiglia Matteo · da rinnovare" },
    { id: "s8", nome: "Ferrari Davide", tessera: "ACLI-2026-020", ruolo: "Socio", iscrizione: "10/09/2024", quota: "pagata", quotaImporto: 15, contatto: "davide.ferrari@gmail.com", note: "Famiglia Anna + Lorenzo" },
    { id: "s9", nome: "Marini Sara", tessera: "ACLI-2026-021", ruolo: "Socio", iscrizione: "12/09/2024", quota: "pagata", quotaImporto: 15, contatto: "sara.marini@gmail.com", note: "Famiglia Giada" },
    { id: "s10", nome: "Greco Elena", tessera: "ACLI-2026-022", ruolo: "Socio", iscrizione: "18/09/2024", quota: "scaduta", quotaImporto: 15, contatto: "elena.greco@gmail.com", note: "Famiglia Tommaso · da rinnovare" },
    { id: "s11", nome: "Esposito Paolo", tessera: "ACLI-2026-023", ruolo: "Socio", iscrizione: "08/09/2024", quota: "pagata", quotaImporto: 15, contatto: "paolo.esposito@gmail.com", note: "Famiglia Sara" },
    { id: "s12", nome: "Conti Anna", tessera: "ACLI-2025-031", ruolo: "Socio", iscrizione: "01/09/2023", quota: "scaduta", quotaImporto: 15, contatto: "anna.conti@gmail.com", note: "Trasferita · non rinnovare" },
    { id: "s13", nome: "De Luca Marco", tessera: "ACLI-2026-024", ruolo: "Socio", iscrizione: "14/09/2024", quota: "pagata", quotaImporto: 15, contatto: "marco.deluca@gmail.com", note: "Famiglia Caterina" },
    { id: "s14", nome: "Rossi Anna", tessera: "ACLI-2026-031", ruolo: "Volontario", iscrizione: "01/02/2026", quota: "pagata", quotaImporto: 15, contatto: "anna.rossi@gmail.com", note: "Volontaria mensa" },
    { id: "s15", nome: "Bortolotti Luca", tessera: "ACLI-2026-032", ruolo: "Volontario", iscrizione: "01/03/2026", quota: "pagata", quotaImporto: 15, contatto: "luca.b@gmail.com", note: "Manutenzione locali" },
  ];

  // === Amministrazione: Google Drive (mock) ===
  const drive = {
    breadcrumb: ["Drive condiviso", "ACLI Calvisano"],
    folders: [
      { id: "f1", nome: "Bilanci", file: 18, modificato: "12/04/2026" },
      { id: "f2", nome: "Verbali direttivo", file: 24, modificato: "02/05/2026" },
      { id: "f3", nome: "Statuto e atti", file: 6, modificato: "10/01/2026" },
      { id: "f4", nome: "Educativo · Doposcuola", file: 47, modificato: "06/05/2026" },
      { id: "f5", nome: "Eventi", file: 12, modificato: "20/04/2026" },
      { id: "f6", nome: "Contratti e fornitori", file: 9, modificato: "15/03/2026" },
    ],
    files: [
      { id: "df1", nome: "Bilancio consuntivo 2025.xlsx", tipo: "xlsx", autore: "Nicolò Patti", modificato: "12/04/2026", dim: "284 KB" },
      { id: "df2", nome: "Verbale direttivo 02-05-2026.docx", tipo: "doc", autore: "Lucia Pecchini", modificato: "02/05/2026", dim: "42 KB" },
      { id: "df3", nome: "Convenzione Comune Calvisano 2026.pdf", tipo: "pdf", autore: "Nicolò Patti", modificato: "20/03/2026", dim: "1.2 MB" },
      { id: "df4", nome: "Iscritti Doposcuola 25-26.xlsx", tipo: "xlsx", autore: "Marta Belli", modificato: "06/05/2026", dim: "118 KB" },
      { id: "df5", nome: "Locandina Festa di primavera.png", tipo: "img", autore: "Marta Belli", modificato: "20/04/2026", dim: "2.4 MB" },
      { id: "df6", nome: "Preventivo materiale didattico.pdf", tipo: "pdf", autore: "Marta Belli", modificato: "01/05/2026", dim: "320 KB" },
      { id: "df7", nome: "Statuto ACLI Calvisano.pdf", tipo: "pdf", autore: "Nicolò Patti", modificato: "10/01/2026", dim: "180 KB" },
      { id: "df8", nome: "Note spese aprile.gsheet", tipo: "xlsx", autore: "Giorgio Antoni", modificato: "30/04/2026", dim: "—" },
    ],
  };

  // === Amministrazione: Posta (Gmail mock) ===
  const mail = [
    { id: "ml1", da: "Comune di Calvisano", email: "protocollo@comune.calvisano.bs.it", oggetto: "Convenzione doposcuola 2026/27 — bozza", anteprima: "Gentile Presidente, in allegato la bozza di rinnovo della convenzione…", data: "Oggi · 09:42", letta: false, etichetta: "Istituzioni", allegati: 1 },
    { id: "ml2", da: "Marta Romano", email: "marta.romano@gmail.com", oggetto: "Re: Iscrizione Sofia — settembre", anteprima: "Buongiorno, confermo l'iscrizione per il prossimo anno. Possiamo parlare per…", data: "Oggi · 08:11", letta: false, etichetta: "Famiglie", allegati: 0 },
    { id: "ml3", da: "Diocesi di Brescia", email: "amministrazione@diocesi.brescia.it", oggetto: "Erogazione contributo 8x1000 — comunicazione", anteprima: "Si comunica l'avvenuta erogazione del contributo per i progetti educativi…", data: "Ieri · 16:08", letta: true, etichetta: "Istituzioni", allegati: 2 },
    { id: "ml4", da: "Banca BCC Garda", email: "noreply@bcc-garda.it", oggetto: "Estratto conto aprile 2026", anteprima: "Disponibile l'estratto conto del mese di aprile per il rapporto 0001234…", data: "Ieri · 06:00", letta: true, etichetta: "Banca", allegati: 1 },
    { id: "ml5", da: "Davide Ferrari", email: "davide.ferrari@gmail.com", oggetto: "Pagamento mese di maggio", anteprima: "Salve, ho fatto il bonifico di 110€ per Lorenzo. Allego ricevuta…", data: "Ieri · 14:22", letta: true, etichetta: "Famiglie", allegati: 1 },
    { id: "ml6", da: "Cancelleria Brescia", email: "ordini@cancelleriabrescia.it", oggetto: "Ordine 2026/0184 — spedito", anteprima: "Il vostro ordine è stato spedito. Tracciamento: BRT45821…", data: "2 giorni fa", letta: true, etichetta: "Fornitori", allegati: 0 },
    { id: "ml7", da: "Giulia Bianchi", email: "giulia.bianchi@gmail.com", oggetto: "Ritiro anticipato Matteo — giovedì", anteprima: "Buongiorno, giovedì dovrò ritirare Matteo alle 15:30 anziché alle 16…", data: "3 giorni fa", letta: true, etichetta: "Famiglie", allegati: 0 },
    { id: "ml8", da: "ACLI Provinciali Brescia", email: "segreteria@aclibrescia.it", oggetto: "Convocazione assemblea provinciale", anteprima: "Si convoca l'assemblea ordinaria per il 28 maggio 2026 alle ore 20:30…", data: "5 giorni fa", letta: true, etichetta: "ACLI", allegati: 1 },
  ];

  // === Eventi/Iniziative generali ===
  const eventi = [
    { id: "ev1", nome: "Festa di primavera", data: "18/05/2026", luogo: "Oratorio S. Michele", responsabile: "Marta Belli", stato: "in_preparazione", budget: 800, incassato: 0 },
    { id: "ev2", nome: "Cena sociale ACLI", data: "07/06/2026", luogo: "Sala parrocchiale", responsabile: "Nicolò Patti", stato: "programmato", budget: 1500, incassato: 0 },
    { id: "ev3", nome: "Raccolta fondi 8x1000", data: "30/04/2026", luogo: "—", responsabile: "Lucia Pecchini", stato: "concluso", budget: 0, incassato: 4200 },
  ];

  // === Educativo: Turni educatori (settimana corrente) ===
  const turni = (() => {
    const days = ["Lun 11", "Mar 12", "Mer 13", "Gio 14", "Ven 15", "Sab 16"];
    const slots = ["14:00–16:00", "16:00–18:00"];
    const educList = ["Marta B.", "Giorgio A.", "Lucia P.", "Davide V."];
    const grid = days.map((d, di) => ({
      day: d,
      slots: slots.map((s, si) => {
        if (di === 5 && si === 1) return { slot: s, educatori: [], stato: "chiuso" };
        if (di === 5 && si === 0) return { slot: s, educatori: ["Marta B."], stato: "scoperto" };
        const n = (di + si) % 4;
        const ed = [educList[n], educList[(n + 2) % 4]];
        if (di === 1 && si === 1) return { slot: s, educatori: [educList[0]], stato: "scoperto" };
        return { slot: s, educatori: ed, stato: "coperto" };
      }),
    }));
    return { days, slots, grid };
  })();

  // === Account/Login ===
  const accounts = [
    { id: "u1", nome: "Nicolò Patti", email: "nicolo@acli.it", ruolo: "admin", aree: ["amm", "edu"], landing: "adm-home" },
    { id: "u2", nome: "Marta Belli", email: "marta.belli@acli.it", ruolo: "coordinatore_educativo", aree: ["edu"], landing: "edu-home" },
    { id: "u3", nome: "Giorgio Antoni", email: "giorgio.antoni@acli.it", ruolo: "volontario_cassa", aree: ["amm-cassa"], landing: "cassa" },
  ];

  const ruoliLabel = {
    admin: "Presidente",
    coordinatore_educativo: "Coordinatore educativo",
    volontario_cassa: "Volontario cassa",
  };

  return {
    bambini, attivita, iscrizioni, rate, educatori, movimenti, utenti,
    presenzeOggi, conti, trend, disponibilita, categorie,
    soci, drive, mail, eventi, turni, accounts, ruoliLabel,
  };
})();
