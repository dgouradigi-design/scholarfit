"""Pays du monde entier : nom en français, région et coordonnées approximatives (centre du pays).

Sert au filtre par région, au comptage des bourses par pays et au globe de la page d'accueil.
Codes ISO 3166-1 alpha-2. Coordonnées arrondies : elles placent un point sur un globe,
pas plus.
"""

REGIONS: dict[str, str] = {
    "afrique": "Afrique",
    "europe": "Europe",
    "amerique": "Amériques",
    "asie": "Asie et Moyen-Orient",
    "oceanie": "Océanie",
}

# code: (nom, région, latitude, longitude)
WORLD: dict[str, tuple[str, str, float, float]] = {
    # ---------------- Afrique
    "DZ": ("Algérie", "afrique", 28.0, 2.6), "AO": ("Angola", "afrique", -12.3, 17.5),
    "BJ": ("Bénin", "afrique", 9.3, 2.3), "BW": ("Botswana", "afrique", -22.3, 24.7),
    "BF": ("Burkina Faso", "afrique", 12.2, -1.6), "BI": ("Burundi", "afrique", -3.4, 29.9),
    "CV": ("Cap-Vert", "afrique", 16.0, -24.0), "CM": ("Cameroun", "afrique", 5.7, 12.4),
    "CF": ("Centrafrique", "afrique", 6.6, 20.9), "TD": ("Tchad", "afrique", 15.4, 18.7),
    "KM": ("Comores", "afrique", -11.9, 43.9), "CG": ("Congo", "afrique", -0.7, 15.2),
    "CD": ("RD Congo", "afrique", -2.9, 23.7), "CI": ("Côte d'Ivoire", "afrique", 7.6, -5.5),
    "DJ": ("Djibouti", "afrique", 11.8, 42.6), "EG": ("Égypte", "afrique", 26.8, 30.8),
    "GQ": ("Guinée équatoriale", "afrique", 1.6, 10.3), "ER": ("Érythrée", "afrique", 15.2, 39.8),
    "SZ": ("Eswatini", "afrique", -26.5, 31.5), "ET": ("Éthiopie", "afrique", 9.1, 40.5),
    "GA": ("Gabon", "afrique", -0.8, 11.6), "GM": ("Gambie", "afrique", 13.4, -15.3),
    "GH": ("Ghana", "afrique", 7.9, -1.0), "GN": ("Guinée", "afrique", 9.9, -9.7),
    "GW": ("Guinée-Bissau", "afrique", 11.8, -15.2), "KE": ("Kenya", "afrique", 0.0, 37.9),
    "LS": ("Lesotho", "afrique", -29.6, 28.2), "LR": ("Liberia", "afrique", 6.4, -9.4),
    "LY": ("Libye", "afrique", 26.3, 17.2), "MG": ("Madagascar", "afrique", -18.8, 46.9),
    "MW": ("Malawi", "afrique", -13.3, 34.3), "ML": ("Mali", "afrique", 17.6, -4.0),
    "MR": ("Mauritanie", "afrique", 21.0, -10.9), "MU": ("Maurice", "afrique", -20.3, 57.6),
    "MA": ("Maroc", "afrique", 31.8, -7.1), "MZ": ("Mozambique", "afrique", -18.7, 35.5),
    "NA": ("Namibie", "afrique", -22.6, 17.1), "NE": ("Niger", "afrique", 17.6, 8.1),
    "NG": ("Nigeria", "afrique", 9.1, 8.7), "RW": ("Rwanda", "afrique", -1.9, 29.9),
    "ST": ("Sao Tomé-et-Principe", "afrique", 0.2, 6.6), "SN": ("Sénégal", "afrique", 14.5, -14.5),
    "SC": ("Seychelles", "afrique", -4.7, 55.5), "SL": ("Sierra Leone", "afrique", 8.5, -11.8),
    "SO": ("Somalie", "afrique", 5.2, 46.2), "ZA": ("Afrique du Sud", "afrique", -30.6, 22.9),
    "SS": ("Soudan du Sud", "afrique", 6.9, 31.3), "SD": ("Soudan", "afrique", 12.9, 30.2),
    "TZ": ("Tanzanie", "afrique", -6.4, 34.9), "TG": ("Togo", "afrique", 8.6, 0.8),
    "TN": ("Tunisie", "afrique", 33.9, 9.5), "UG": ("Ouganda", "afrique", 1.4, 32.3),
    "ZM": ("Zambie", "afrique", -13.1, 27.8), "ZW": ("Zimbabwe", "afrique", -19.0, 29.2),
    # ---------------- Europe
    "AL": ("Albanie", "europe", 41.2, 20.2), "DE": ("Allemagne", "europe", 51.2, 10.4),
    "AD": ("Andorre", "europe", 42.5, 1.6), "AT": ("Autriche", "europe", 47.5, 14.6),
    "BE": ("Belgique", "europe", 50.5, 4.5), "BY": ("Biélorussie", "europe", 53.7, 28.0),
    "BA": ("Bosnie-Herzégovine", "europe", 43.9, 17.7), "BG": ("Bulgarie", "europe", 42.7, 25.5),
    "HR": ("Croatie", "europe", 45.1, 15.2), "CY": ("Chypre", "europe", 35.1, 33.4),
    "CZ": ("Tchéquie", "europe", 49.8, 15.5), "DK": ("Danemark", "europe", 56.3, 9.5),
    "EE": ("Estonie", "europe", 58.6, 25.0), "ES": ("Espagne", "europe", 40.5, -3.7),
    "FI": ("Finlande", "europe", 61.9, 25.7), "FR": ("France", "europe", 46.2, 2.2),
    "GR": ("Grèce", "europe", 39.1, 21.8), "HU": ("Hongrie", "europe", 47.2, 19.5),
    "IE": ("Irlande", "europe", 53.4, -8.2), "IS": ("Islande", "europe", 64.9, -19.0),
    "IT": ("Italie", "europe", 41.9, 12.6), "XK": ("Kosovo", "europe", 42.6, 20.9),
    "LV": ("Lettonie", "europe", 56.9, 24.6), "LI": ("Liechtenstein", "europe", 47.2, 9.6),
    "LT": ("Lituanie", "europe", 55.2, 23.9), "LU": ("Luxembourg", "europe", 49.8, 6.1),
    "MT": ("Malte", "europe", 35.9, 14.4), "MD": ("Moldavie", "europe", 47.4, 28.4),
    "MC": ("Monaco", "europe", 43.7, 7.4), "ME": ("Monténégro", "europe", 42.7, 19.4),
    "MK": ("Macédoine du Nord", "europe", 41.6, 21.7), "NO": ("Norvège", "europe", 60.5, 8.5),
    "NL": ("Pays-Bas", "europe", 52.1, 5.3), "PL": ("Pologne", "europe", 51.9, 19.1),
    "PT": ("Portugal", "europe", 39.4, -8.2), "RO": ("Roumanie", "europe", 45.9, 25.0),
    "GB": ("Royaume-Uni", "europe", 55.4, -3.4), "RU": ("Russie", "europe", 61.5, 105.3),
    "SM": ("Saint-Marin", "europe", 43.9, 12.5), "RS": ("Serbie", "europe", 44.0, 21.0),
    "SK": ("Slovaquie", "europe", 48.7, 19.7), "SI": ("Slovénie", "europe", 46.2, 15.0),
    "SE": ("Suède", "europe", 60.1, 18.6), "CH": ("Suisse", "europe", 46.8, 8.2),
    "UA": ("Ukraine", "europe", 48.4, 31.2), "VA": ("Vatican", "europe", 41.9, 12.5),
    # ---------------- Amériques
    "AG": ("Antigua-et-Barbuda", "amerique", 17.1, -61.8), "AR": ("Argentine", "amerique", -38.4, -63.6),
    "BS": ("Bahamas", "amerique", 25.0, -77.4), "BB": ("Barbade", "amerique", 13.2, -59.5),
    "BZ": ("Belize", "amerique", 17.2, -88.5), "BO": ("Bolivie", "amerique", -16.3, -63.6),
    "BR": ("Brésil", "amerique", -14.2, -51.9), "CA": ("Canada", "amerique", 56.1, -106.3),
    "CL": ("Chili", "amerique", -35.7, -71.5), "CO": ("Colombie", "amerique", 4.6, -74.3),
    "CR": ("Costa Rica", "amerique", 9.7, -83.8), "CU": ("Cuba", "amerique", 21.5, -77.8),
    "DM": ("Dominique", "amerique", 15.4, -61.4), "DO": ("République dominicaine", "amerique", 18.7, -70.2),
    "EC": ("Équateur", "amerique", -1.8, -78.2), "SV": ("Salvador", "amerique", 13.8, -88.9),
    "US": ("États-Unis", "amerique", 37.1, -95.7), "GD": ("Grenade", "amerique", 12.1, -61.7),
    "GT": ("Guatemala", "amerique", 15.8, -90.2), "GY": ("Guyana", "amerique", 4.9, -58.9),
    "HT": ("Haïti", "amerique", 18.97, -72.3), "HN": ("Honduras", "amerique", 15.2, -86.2),
    "JM": ("Jamaïque", "amerique", 18.1, -77.3), "MX": ("Mexique", "amerique", 23.6, -102.6),
    "NI": ("Nicaragua", "amerique", 12.9, -85.2), "PA": ("Panama", "amerique", 8.5, -80.8),
    "PY": ("Paraguay", "amerique", -23.4, -58.4), "PE": ("Pérou", "amerique", -9.2, -75.0),
    "KN": ("Saint-Christophe-et-Niévès", "amerique", 17.4, -62.8), "LC": ("Sainte-Lucie", "amerique", 13.9, -61.0),
    "VC": ("Saint-Vincent-et-les-Grenadines", "amerique", 12.98, -61.3), "SR": ("Suriname", "amerique", 3.9, -56.0),
    "TT": ("Trinité-et-Tobago", "amerique", 10.7, -61.2), "UY": ("Uruguay", "amerique", -32.5, -55.8),
    "VE": ("Venezuela", "amerique", 6.4, -66.6),
    # ---------------- Asie et Moyen-Orient
    "AF": ("Afghanistan", "asie", 33.9, 67.7), "SA": ("Arabie saoudite", "asie", 23.9, 45.1),
    "AM": ("Arménie", "asie", 40.1, 45.0), "AZ": ("Azerbaïdjan", "asie", 40.1, 47.6),
    "BH": ("Bahreïn", "asie", 26.0, 50.6), "BD": ("Bangladesh", "asie", 23.7, 90.4),
    "BT": ("Bhoutan", "asie", 27.5, 90.4), "MM": ("Birmanie", "asie", 21.9, 95.96),
    "BN": ("Brunei", "asie", 4.5, 114.7), "KH": ("Cambodge", "asie", 12.6, 105.0),
    "CN": ("Chine", "asie", 35.9, 104.2), "KP": ("Corée du Nord", "asie", 40.3, 127.5),
    "KR": ("Corée du Sud", "asie", 35.9, 127.8), "AE": ("Émirats arabes unis", "asie", 23.4, 53.8),
    "GE": ("Géorgie", "asie", 42.3, 43.4), "IN": ("Inde", "asie", 20.6, 79.0),
    "ID": ("Indonésie", "asie", -0.8, 113.9), "IQ": ("Irak", "asie", 33.2, 43.7),
    "IR": ("Iran", "asie", 32.4, 53.7), "IL": ("Israël", "asie", 31.0, 34.9),
    "JP": ("Japon", "asie", 36.2, 138.3), "JO": ("Jordanie", "asie", 30.6, 36.2),
    "KZ": ("Kazakhstan", "asie", 48.0, 66.9), "KG": ("Kirghizistan", "asie", 41.2, 74.8),
    "KW": ("Koweït", "asie", 29.3, 47.5), "LA": ("Laos", "asie", 19.9, 102.5),
    "LB": ("Liban", "asie", 33.9, 35.9), "MY": ("Malaisie", "asie", 4.2, 101.98),
    "MV": ("Maldives", "asie", 3.2, 73.2), "MN": ("Mongolie", "asie", 46.9, 103.8),
    "NP": ("Népal", "asie", 28.4, 84.1), "OM": ("Oman", "asie", 21.5, 55.9),
    "UZ": ("Ouzbékistan", "asie", 41.4, 64.6), "PK": ("Pakistan", "asie", 30.4, 69.3),
    "PS": ("Palestine", "asie", 31.95, 35.2), "PH": ("Philippines", "asie", 12.9, 121.8),
    "QA": ("Qatar", "asie", 25.4, 51.2), "SG": ("Singapour", "asie", 1.35, 103.8),
    "LK": ("Sri Lanka", "asie", 7.9, 80.8), "SY": ("Syrie", "asie", 34.8, 39.0),
    "TJ": ("Tadjikistan", "asie", 38.9, 71.3), "TW": ("Taïwan", "asie", 23.7, 121.0),
    "TH": ("Thaïlande", "asie", 15.9, 100.99), "TL": ("Timor oriental", "asie", -8.9, 125.7),
    "TM": ("Turkménistan", "asie", 38.97, 59.6), "TR": ("Turquie", "asie", 38.96, 35.2),
    "VN": ("Vietnam", "asie", 14.1, 108.3), "YE": ("Yémen", "asie", 15.6, 48.5),
    # ---------------- Océanie
    "AU": ("Australie", "oceanie", -25.3, 133.8), "FJ": ("Fidji", "oceanie", -17.7, 178.1),
    "KI": ("Kiribati", "oceanie", 1.9, -157.4), "MH": ("Îles Marshall", "oceanie", 7.1, 171.2),
    "FM": ("Micronésie", "oceanie", 7.4, 150.6), "NR": ("Nauru", "oceanie", -0.5, 166.9),
    "NZ": ("Nouvelle-Zélande", "oceanie", -40.9, 174.9), "PW": ("Palaos", "oceanie", 7.5, 134.6),
    "PG": ("Papouasie-Nouvelle-Guinée", "oceanie", -6.3, 143.96), "WS": ("Samoa", "oceanie", -13.8, -172.1),
    "SB": ("Îles Salomon", "oceanie", -9.6, 160.2), "TO": ("Tonga", "oceanie", -21.2, -175.2),
    "TV": ("Tuvalu", "oceanie", -7.1, 177.6), "VU": ("Vanuatu", "oceanie", -15.4, 166.96),
}


def region_of(code: str) -> str | None:
    w = WORLD.get(code)
    return w[1] if w else None


def countries_in(region: str) -> set[str]:
    return {c for c, w in WORLD.items() if w[1] == region}
