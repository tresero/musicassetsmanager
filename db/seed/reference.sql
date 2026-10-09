SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

COPY music.country (code, name) FROM stdin;
AD	Andorra
AE	United Arab Emirates
AF	Afghanistan
AG	Antigua and Barbuda
AI	Anguilla
AL	Albania
AM	Armenia
AO	Angola
AQ	Antarctica
AR	Argentina
AS	American Samoa
AT	Austria
AU	Australia
AW	Aruba
AX	Aland Islands
AZ	Azerbaijan
BA	Bosnia and Herzegovina
BB	Barbados
BD	Bangladesh
BE	Belgium
BF	Burkina Faso
BG	Bulgaria
BH	Bahrain
BI	Burundi
BJ	Benin
BL	Saint Barthelemy
BM	Bermuda
BN	Brunei Darussalam
BO	Bolivia
BQ	Caribbean Netherlands
BR	Brazil
BS	Bahamas
BT	Bhutan
BV	Bouvet Island
BW	Botswana
BY	Belarus
BZ	Belize
CA	Canada
CC	Cocos (Keeling) Islands
CD	Congo\\, Democratic Republic of
CF	Central African Republic
CG	Congo
CH	Switzerland
CI	Cote d'Ivoire
CK	Cook Islands
CL	Chile
CM	Cameroon
CN	China
CO	Colombia
CR	Costa Rica
CU	Cuba
CV	Cape Verde
CW	Curacao
CX	Christmas Island
CY	Cyprus
CZ	Czech Republic
DE	Germany
DJ	Djibouti
DK	Denmark
DM	Dominica
DO	Dominican Republic
DZ	Algeria
EC	Ecuador
EE	Estonia
EG	Egypt
EH	Western Sahara
ER	Eritrea
ES	Spain
ET	Ethiopia
FI	Finland
FJ	Fiji
FK	Falkland Islands
FM	Micronesia\\, Federated States of
FO	Faroe Islands
FR	France
GA	Gabon
GB	United Kingdom
GD	Grenada
GE	Georgia
GF	French Guiana
GG	Guernsey
GH	Ghana
GI	Gibraltar
GL	Greenland
GM	Gambia
GN	Guinea
GP	Guadeloupe
GQ	Equatorial Guinea
GR	Greece
GS	South Georgia and the South Sandwich Islands
GT	Guatemala
GU	Guam
GW	Guinea-Bissau
GY	Guyana
HK	Hong Kong
HM	Heard and McDonald Islands
HN	Honduras
HR	Croatia
HT	Haiti
HU	Hungary
ID	Indonesia
IE	Ireland
IL	Israel
IM	Isle of Man
IN	India
IO	British Indian Ocean Territory
IQ	Iraq
IR	Iran
IS	Iceland
IT	Italy
JE	Jersey
JM	Jamaica
JO	Jordan
JP	Japan
KE	Kenya
KG	Kyrgyzstan
KH	Cambodia
KI	Kiribati
KM	Comoros
KN	Saint Kitts and Nevis
KP	North Korea
KR	South Korea
KW	Kuwait
KY	Cayman Islands
KZ	Kazakhstan
LA	Lao People's Democratic Republic
LB	Lebanon
LC	Saint Lucia
LI	Liechtenstein
LK	Sri Lanka
LR	Liberia
LS	Lesotho
LT	Lithuania
LU	Luxembourg
LV	Latvia
LY	Libya
MA	Morocco
MC	Monaco
MD	Moldova
ME	Montenegro
MF	Saint-Martin (France)
MG	Madagascar
MH	Marshall Islands
MK	Macedonia
ML	Mali
MM	Myanmar
MN	Mongolia
MO	Macau
MP	Northern Mariana Islands
MQ	Martinique
MR	Mauritania
MS	Montserrat
MT	Malta
MU	Mauritius
MV	Maldives
MW	Malawi
MX	Mexico
MY	Malaysia
MZ	Mozambique
NA	Namibia
NC	New Caledonia
NE	Niger
NF	Norfolk Island
NG	Nigeria
NI	Nicaragua
NL	The Netherlands
NO	Norway
NP	Nepal
NR	Nauru
NU	Niue
NZ	New Zealand
OM	Oman
PA	Panama
PE	Peru
PF	French Polynesia
PG	Papua New Guinea
PH	Philippines
PK	Pakistan
PL	Poland
PM	St. Pierre and Miquelon
PN	Pitcairn
PR	Puerto Rico
PS	Palestine\\, State of
PT	Portugal
PW	Palau
PY	Paraguay
QA	Qatar
RE	Reunion
RO	Romania
RS	Serbia
RU	Russian Federation
RW	Rwanda
SA	Saudi Arabia
SB	Solomon Islands
SC	Seychelles
SD	Sudan
SE	Sweden
SG	Singapore
SH	Saint Helena
SI	Slovenia
SJ	Svalbard and Jan Mayen Islands
SK	Slovakia
SL	Sierra Leone
SM	San Marino
SN	Senegal
SO	Somalia
SR	Suriname
SS	South Sudan
ST	Sao Tome and Principe
SV	El Salvador
SX	Sint Maarten (Dutch part)
SY	Syria
SZ	Swaziland
TC	Turks and Caicos Islands
TD	Chad
TF	French Southern Territories
TG	Togo
TH	Thailand
TJ	Tajikistan
TK	Tokelau
TL	Timor-Leste
TM	Turkmenistan
TN	Tunisia
TO	Tonga
TR	Turkey
TT	Trinidad and Tobago
TV	Tuvalu
TW	Taiwan
TZ	Tanzania
UA	Ukraine
UG	Uganda
UM	United States Minor Outlying Islands
US	United States
UY	Uruguay
UZ	Uzbekistan
VA	Vatican
VC	Saint Vincent and the Grenadines
VE	Venezuela
VG	Virgin Islands (British)
VI	Virgin Islands (U.S.)
VN	Vietnam
VU	Vanuatu
WF	Wallis and Futuna Islands
WS	Samoa
YE	Yemen
YT	Mayotte
ZA	South Africa
ZM	Zambia
ZW	Zimbabwe
\.

COPY music.language (code, name, iso_name) FROM stdin;
aa	Afar	Afar
ab	Abkhazian	Abkhazian
ae	Avestan	Avestan
af	Afrikaans	Afrikaans
ak	Akan	Akan
am	Amharic	Amharic
an	Aragonese	Aragonese
ar	Arabic	Arabic
as	Assamese	Assamese
av	Avaric	Avaric
ay	Aymara	Aymara
az	Azerbaijani	Azerbaijani
ba	Bashkir	Bashkir
be	Belarusian	Belarusian
bg	Bulgarian	Bulgarian
bi	Bislama	Bislama
bm	Bambara	Bambara
bn	Bengali	Bengali
bo	Tibetan	Tibetan
br	Breton	Breton
bs	Bosnian	Bosnian
ca	Catalan	Catalan; Valencian
ce	Chechen	Chechen
ch	Chamorro	Chamorro
co	Corsican	Corsican
cr	Cree	Cree
cs	Czech	Czech
cu	Church Slavic	Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic
cv	Chuvash	Chuvash
cy	Welsh	Welsh
da	Danish	Danish
de	German	German
dv	Divehi	Divehi; Dhivehi; Maldivian
dz	Dzongkha	Dzongkha
ee	Ewe	Ewe
el	Modern Greek (1453-)	Modern Greek (1453-)
en	English	English
eo	Esperanto	Esperanto
es	Spanish	Spanish; Castilian
et	Estonian	Estonian
eu	Basque	Basque
fa	Persian	Persian
ff	Fulah	Fulah
fi	Finnish	Finnish
fj	Fijian	Fijian
fo	Faroese	Faroese
fr	French	French
fy	Western Frisian	Western Frisian
ga	Irish	Irish
gd	Gaelic	Gaelic; Scottish Gaelic
gl	Galician	Galician
gn	Guarani	Guarani
gu	Gujarati	Gujarati
gv	Manx	Manx
ha	Hausa	Hausa
he	Hebrew	Hebrew
hi	Hindi	Hindi
ho	Hiri Motu	Hiri Motu
hr	Croatian	Croatian
ht	Haitian	Haitian; Haitian Creole
hu	Hungarian	Hungarian
hy	Armenian	Armenian
hz	Herero	Herero
ia	Interlingua (International Auxiliary Language Association)	Interlingua (International Auxiliary Language Association)
id	Indonesian	Indonesian
ie	Interlingue	Interlingue; Occidental
ig	Igbo	Igbo
ii	Sichuan Yi	Sichuan Yi; Nuosu
ik	Inupiaq	Inupiaq
io	Ido	Ido
is	Icelandic	Icelandic
it	Italian	Italian
iu	Inuktitut	Inuktitut
ja	Japanese	Japanese
jv	Javanese	Javanese
ka	Georgian	Georgian
kg	Kongo	Kongo
ki	Kikuyu	Kikuyu; Gikuyu
kj	Kuanyama	Kuanyama; Kwanyama
kk	Kazakh	Kazakh
kl	Kalaallisut	Kalaallisut; Greenlandic
km	Central Khmer	Central Khmer
kn	Kannada	Kannada
ko	Korean	Korean
kr	Kanuri	Kanuri
ks	Kashmiri	Kashmiri
ku	Kurdish	Kurdish
kv	Komi	Komi
kw	Cornish	Cornish
ky	Kirghiz	Kirghiz; Kyrgyz
la	Latin	Latin
lb	Luxembourgish	Luxembourgish; Letzeburgesch
lg	Ganda	Ganda
li	Limburgan	Limburgan; Limburger; Limburgish
ln	Lingala	Lingala
lo	Lao	Lao
lt	Lithuanian	Lithuanian
lu	Luba-Katanga	Luba-Katanga
lv	Latvian	Latvian
mg	Malagasy	Malagasy
mh	Marshallese	Marshallese
mi	Maori	Maori
mk	Macedonian	Macedonian
ml	Malayalam	Malayalam
mn	Mongolian	Mongolian
mr	Marathi	Marathi
ms	Malay	Malay
mt	Maltese	Maltese
my	Burmese	Burmese
na	Nauru	Nauru
nb	Norwegian Bokmål	Norwegian Bokmål
nd	North Ndebele	North Ndebele
ne	Nepali	Nepali
ng	Ndonga	Ndonga
nl	Dutch	Dutch; Flemish
nn	Norwegian Nynorsk	Norwegian Nynorsk
no	Norwegian	Norwegian
nr	South Ndebele	South Ndebele
nv	Navajo	Navajo; Navaho
ny	Chichewa	Chichewa; Chewa; Nyanja
oc	Occitan (post 1500)	Occitan (post 1500)
oj	Ojibwa	Ojibwa
om	Oromo	Oromo
or	Oriya	Oriya
os	Ossetian	Ossetian; Ossetic
pa	Panjabi	Panjabi; Punjabi
pi	Pali	Pali
pl	Polish	Polish
ps	Pushto	Pushto; Pashto
pt	Portuguese	Portuguese
qu	Quechua	Quechua
rm	Romansh	Romansh
rn	Rundi	Rundi
ro	Romanian	Romanian; Moldavian; Moldovan
ru	Russian	Russian
rw	Kinyarwanda	Kinyarwanda
sa	Sanskrit	Sanskrit
sc	Sardinian	Sardinian
sd	Sindhi	Sindhi
se	Northern Sami	Northern Sami
sg	Sango	Sango
si	Sinhala	Sinhala; Sinhalese
sk	Slovak	Slovak
sl	Slovenian	Slovenian
sm	Samoan	Samoan
sn	Shona	Shona
so	Somali	Somali
sq	Albanian	Albanian
sr	Serbian	Serbian
ss	Swati	Swati
st	Sotho, Southern	Sotho, Southern
su	Sundanese	Sundanese
sv	Swedish	Swedish
sw	Swahili	Swahili
ta	Tamil	Tamil
te	Telugu	Telugu
tg	Tajik	Tajik
th	Thai	Thai
ti	Tigrinya	Tigrinya
tk	Turkmen	Turkmen
tl	Tagalog	Tagalog
tn	Tswana	Tswana
to	Tonga (Tonga Islands)	Tonga (Tonga Islands)
tr	Turkish	Turkish
ts	Tsonga	Tsonga
tt	Tatar	Tatar
tw	Twi	Twi
ty	Tahitian	Tahitian
ug	Uighur	Uighur; Uyghur
uk	Ukrainian	Ukrainian
ur	Urdu	Urdu
uz	Uzbek	Uzbek
ve	Venda	Venda
vi	Vietnamese	Vietnamese
vo	Volapük	Volapük
wa	Walloon	Walloon
wo	Wolof	Wolof
xh	Xhosa	Xhosa
yi	Yiddish	Yiddish
yo	Yoruba	Yoruba
za	Zhuang	Zhuang; Chuang
zh	Chinese	Chinese
zu	Zulu	Zulu
zxx	Instrumental	No linguistic content; Not applicable
\.

COPY music.vocabulary (prefix, name, base_uri) FROM stdin;
dcterms	Dublin Core Terms	http://purl.org/dc/terms/
foaf	FOAF	http://xmlns.com/foaf/0.1/
mo	Music Ontology	http://purl.org/ontology/mo/
schema	Schema.org	https://schema.org/
\.

COPY music.schema_type (id, class_name, vocabulary) FROM stdin;
1	MusicRecording	schema
2	MusicComposition	schema
3	MusicAlbum	schema
4	MusicRelease	schema
5	MusicGroup	schema
6	MusicPlaylist	schema
7	MusicEvent	schema
8	MusicVenue	schema
9	AudioObject	schema
10	CreativeWork	schema
11	Person	schema
12	Organization	schema
\.
SELECT setval(pg_get_serial_sequence('music.schema_type', 'id'), (SELECT max(id) FROM music.schema_type));

COPY music.pro (code, name, cisac_code, home_country) FROM stdin;
ABRAMUS	Associação Brasileira de Música e Artes	201	BR
ACAM	Asociación de Compositores y Autores Musicales de Costa Rica	107	CR
ACDAM	Agencia Cubana de Derecho de Autor Musical	103	CU
ACUM	Society of Authors, Composers and Music Publishers in Israel	001	IL
AGADU	Asociación General de Autores del Uruguay	004	UY
AKKA-LAA	Autortiesību un komunicēšanās konsultāciju aģentūra / Latvijas Autoru apvienība	122	LV
AKM	Autoren, Komponisten und Musikverleger (AKM)	005	AT
ALLTRACK	AllTrack	\N	US
AMAR	Associação de Músicos, Arranjadores e Regentes	030	BR
AMCOS	Australasian Mechanical Copyright Owners Society	012	AU
AMRA	American Mechanical Rights Agency	017	US
AMUS	Association of Composers and Music Authors of Bosnia and Herzegovina	273	BA
APA	Autores Paraguayos Asociados	015	PY
APDAYC	Asociación Peruana de Autores y Compositores	007	PE
APRA	Australasian Performing Right Association	008	AU
ARTISJUS	Artisjus Magyar Szerzői Jogvédő Iroda Egyesület	009	HU
ASCAP	American Society of Composers, Authors and Publishers	010	US
AUME	Austro-Mechana	011	AT
BBDA	Bureau Burkinabè du Droit d'Auteur	045	BF
BCDA	Bureau Congolais du Droit d'Auteur	047	CG
BGDA	Bureau Guinéen du Droit d'Auteur	018	GN
BMDA	Bureau Marocain du Droit d'Auteur	019	MA
BMI	Broadcast Music, Inc.	021	US
BUBEDRA	Bureau Béninois du Droit d'Auteur	037	BJ
BUMA	Vereniging Buma	023	NL
BUMDA	Bureau Malien du Droit d'Auteur	016	ML
BURIDA	Bureau Ivoirien du Droit d'Auteur	024	CI
CAPASSO	Composers, Authors and Publishers Association	283	ZA
CASH	Composers and Authors Society of Hong Kong	026	HK
CMRRA	Canadian Musical Reproduction Rights Agency	088	CA
COMPASS	Composers and Authors Society of Singapore	106	SG
COSBOTS	Copyright Society of Botswana	331	BW
COSCAP	Copyright Society of Composers, Authors and Publishers	169	BB
COSOMA	Copyright Society of Malawi	124	MW
COSON	Copyright Society of Nigeria	268	NG
COSOTA	Copyright Society of Tanzania	223	TZ
COTT	Copyright Organisation of Trinidad and Tobago	096	TT
EAU	Eesti Autorite Ühing	116	EE
ECCO	Eastern Caribbean Collective Organisation for Music Rights	214	LC
ESMAA	Emirates Music Rights Association	\N	AE
FILSCAP	Filipino Society of Composers, Authors and Publishers	032	PH
GCA	Georgian Copyright Association	204	GE
GEMA	Gesellschaft für musikalische Aufführungs- und mechanische Vervielfältigungsrechte	035	DE
GHAMRO	Ghana Music Rights Organisation	285	GH
GMR	Global Music Rights	\N	US
HDS-ZAMP	Hrvatsko društvo skladatelja (HDS-ZAMP)	111	HR
HFA	Harry Fox Agency	\N	US
IMRO	Irish Music Rights Organisation	128	IE
IPRS	Indian Performing Right Society	036	IN
JACAP	Jamaica Association of Composers, Authors and Publishers	176	JM
JASRAC	Japanese Society for Rights of Authors, Composers and Publishers	038	JP
KAZAK	Kazakhstan Authors' Society	177	KZ
KODA	KODA	040	DK
KOMCA	Korea Music Copyright Association	118	KR
LATGA	Lietuvos autorių teisių gynimo asociacija	110	LT
MACP	Music Authors' Copyright Protection	104	MY
MASA	Mauritius Society of Authors	105	MU
MCPS	Mechanical-Copyright Protection Society Limited	044	GB
MCSC	Music Copyright Society of China	119	CN
MCSK	Music Copyright Society of Kenya	043	KE
MCSN	Musical Copyright Society Nigeria	022	NG
MCT	Music Copyright (Thailand)	126	TH
MESAM	Musical Work Owners' Society of Turkey (MESAM)	117	TR
MLC	The Mechanical Licensing Collective	\N	US
MSG	Musical Work Owners' Group of Turkey (MSG)	200	TR
MUSICAUTOR	MUSICAUTOR	039	BG
MUST	Music Copyright Society Chinese Taipei	161	TW
NASCAM	Namibian Society of Composers and Authors of Music	102	NA
NCB	Nordisk Copyright Bureau	048	DK
NEXTONE	NexTone, Inc.	\N	JP
OMDA	Office Malgache du Droit d'Auteur	033	MG
ONDA	Office National des Droits d'Auteur	049	DZ
OSA	Ochranný svaz autorský pro práva k dílům hudebním	050	CZ
PRS	Performing Right Society Limited	052	GB
RAO	Russian Authors' Society	094	RU
SABAM	Société Belge des Auteurs, Compositeurs et Éditeurs	055	BE
SACEM	Société des auteurs, compositeurs et éditeurs de musique	058	FR
SACEM-LB	SACEM Liban	\N	LB
SACEMLUX	SACEM Luxembourg	233	LU
SACENC	SACEM Nouvelle-Calédonie (SACENC)	235	NC
SACERAU	Society of Authors, Composers and Publishers (Egypt)	057	EG
SACM	Sociedad de Autores y Compositores de México	059	MX
SACVEN	Sociedad de Autores y Compositores de Venezuela	060	VE
SADAIC	Sociedad Argentina de Autores y Compositores de Música	061	AR
SAMRO	Southern African Music Rights Organisation	063	ZA
SAYCE	Sociedad de Autores y Compositores Ecuatorianos	065	EC
SAYCO	Sociedad de Autores y Compositores de Colombia	084	CO
SAZAS	Združenje skladateljev, avtorjev in založnikov Slovenije (SAZAS)	112	SI
SBACEM	Sociedade Brasileira de Autores, Compositores e Escritores de Música	066	BR
SCD	Sociedad Chilena del Derecho de Autor	029	CL
SDRM	Société pour l'administration du droit de reproduction mécanique	068	FR
SESAC	SESAC, Inc.	071	US
SGACEDOM	Sociedad General de Autores, Compositores y Editores Dominicana de Música	227	DO
SGAE	Sociedad General de Autores y Editores	072	ES
SIAE	Società Italiana degli Autori ed Editori	074	IT
SICAM	Sociedade Independente de Compositores e Autores Musicais	086	BR
SOBODAYCOM	Sociedad Boliviana de Autores y Compositores de Música	129	BO
SOCAN	Society of Composers, Authors and Music Publishers of Canada	101	CA
SOCINPRO	Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais	189	BR
SODAV	Société Sénégalaise du Droit d'Auteur et des Droits Voisins	025	SN
SOKOJ	Serbian Music Authors' Organization (SOKOJ)	064	RS
SOZA	Slovenský ochranný zväz autorský pre práva k hudobným dielam	085	SK
SPA	Sociedade Portuguesa de Autores	069	PT
SPAC	Sociedad Panameña de Autores y Compositores	146	PA
STEF	Samband tónskálda og eigenda flutningsréttar (STEF)	077	IS
STEMRA	Stichting Stemra	078	NL
STIM	Svenska Tonsättares Internationella Musikbyrå	079	SE
SUISA	SUISA - Cooperative Society of Music Authors and Publishers	080	CH
TEOSTO	Teosto ry	089	FI
TONO	TONO SA	090	NO
UACRR	Ukrainian Agency of Copyright and Related Rights	140	UA
UBC	União Brasileira de Compositores	093	BR
UCMR-ADA	Uniunea Compozitorilor și Muzicologilor din România - ADA	115	RO
UNKNOWN	Unidentified society	\N	US
UPRS	Uganda Performing Right Society	234	UG
VCPMC	Vietnam Center for Protection of Music Copyright	246	VN
WAMI	Wahana Musik Indonesia	269	ID
ZAIKS	Stowarzyszenie Autorów ZAiKS	097	PL
ZAMCOPS	Zambia Music Copyright Protection Society	133	ZM
ZIMURA	Zimbabwe Music Rights Association	098	ZW
\.

COPY music.pro_territory (pro_code, country_code) FROM stdin;
ABRAMUS	BR
ACAM	CR
ACDAM	CU
ACUM	IL
AGADU	UY
AKKA-LAA	LV
AKM	AT
ALLTRACK	US
AMAR	BR
AMCOS	AU
AMCOS	NZ
AMRA	US
AMUS	BA
APA	PY
APDAYC	PE
APRA	AU
APRA	NZ
ARTISJUS	HU
ASCAP	US
AUME	AT
BBDA	BF
BCDA	CG
BGDA	GN
BMDA	MA
BMI	US
BUBEDRA	BJ
BUMA	NL
BUMDA	ML
BURIDA	CI
CAPASSO	ZA
CASH	HK
CMRRA	CA
COMPASS	SG
COSBOTS	BW
COSCAP	BB
COSOMA	MW
COSON	NG
COSOTA	TZ
COTT	TT
EAU	EE
ECCO	LC
ESMAA	AE
FILSCAP	PH
GCA	GE
GEMA	DE
GHAMRO	GH
GMR	US
HDS-ZAMP	HR
HFA	US
IMRO	IE
IPRS	IN
JACAP	JM
JASRAC	JP
KAZAK	KZ
KODA	DK
KOMCA	KR
LATGA	LT
MACP	MY
MASA	MU
MCPS	GB
MCSC	CN
MCSK	KE
MCSN	NG
MCT	TH
MESAM	TR
MLC	US
MSG	TR
MUSICAUTOR	BG
MUST	TW
NASCAM	NA
NCB	DK
NCB	FI
NCB	IS
NCB	NO
NCB	SE
NEXTONE	JP
OMDA	MG
ONDA	DZ
OSA	CZ
PRS	GB
RAO	RU
SABAM	BE
SACEM	FR
SACEM	MC
SACEM-LB	LB
SACEMLUX	LU
SACENC	NC
SACERAU	EG
SACM	MX
SACVEN	VE
SADAIC	AR
SAMRO	ZA
SAYCE	EC
SAYCO	CO
SAZAS	SI
SBACEM	BR
SCD	CL
SDRM	FR
SESAC	US
SGACEDOM	DO
SGAE	ES
SIAE	IT
SICAM	BR
SOBODAYCOM	BO
SOCAN	CA
SOCINPRO	BR
SODAV	SN
SOKOJ	RS
SOZA	SK
SPA	PT
SPAC	PA
STEF	IS
STEMRA	NL
STIM	SE
SUISA	CH
SUISA	LI
TEOSTO	FI
TONO	NO
UACRR	UA
UBC	BR
UCMR-ADA	RO
UNKNOWN	US
UPRS	UG
VCPMC	VN
WAMI	ID
ZAIKS	PL
ZAMCOPS	ZM
ZIMURA	ZW
\.

COPY music.key_signature (name, tonic, mode, accidentals) FROM stdin;
A	A	major	3
Ab	Ab	major	-4
Ab minor	Ab	minor	-7
A minor	A	minor	0
A# minor	A#	minor	7
B	B	major	5
Bb	Bb	major	-2
Bb minor	Bb	minor	-5
B minor	B	minor	2
C	C	major	0
C#	C#	major	7
Cb	Cb	major	-7
C minor	C	minor	-3
C# minor	C#	minor	4
D	D	major	2
Db	Db	major	-5
D minor	D	minor	-1
D# minor	D#	minor	6
E	E	major	4
Eb	Eb	major	-3
Eb minor	Eb	minor	-6
E minor	E	minor	1
F	F	major	-1
F#	F#	major	6
F minor	F	minor	-4
F# minor	F#	minor	3
G	G	major	1
Gb	Gb	major	-6
G minor	G	minor	-2
G# minor	G#	minor	5
\.

COPY music.instrument (id, name, ddex_code) FROM stdin;
2	Electric Guitar	ElectricGuitar
3	Bass Guitar	BassGuitar
4	Drums	DrumKit
5	Piano	Piano
6	Keyboard	Keyboard
7	Violin	Violin
8	Viola	Viola
9	Cello	Cello
10	Trumpet	Trumpet
11	Saxophone	Saxophone
12	Trombone	Trombone
13	Flute	Flute
14	Clarinet	Clarinet
15	French Horn	FrenchHorn
16	Harp	Harp
17	Accordion	Accordion
18	Ukulele	Ukulele
19	Banjo	Banjo
20	Mandolin	Mandolin
21	Congas	Congas
23	Djembe	Djembe
24	Tabla	Tabla
25	Sitar	Sitar
26	Shakuhachi	Shakuhachi
27	Koto	Koto
28	Guzheng	Guzheng
29	Didgeridoo	Didgeridoo
30	Kora	Kora
31	Cenk	Harp
32	Ney	NeyFlute
33	Santoor	Santoor
34	Oud	Oud
35	Saz	Baglama
36	Charango	Charango
37	Panpipes	PanFlute
38	Recorder	Recorder
39	Steel Drums	SteelDrums
41	Double Bass	DoubleBass
44	Mbira	Mbira
46	Tuba	Tuba
47	Sousaphone	Sousaphone
48	Timpani	Timpani
49	Vibraphone	Vibraphone
50	Marimba	Marimba
51	Glockenspiel	Glockenspiel
52	Xylophone	Xylophone
55	Bongo	Bongos
57	Shekere	Shekere
58	Caxixi	Caxixi
59	Kalimba	Kalimba
60	Kawa	UserDefined
62	Shofar	Shofar
64	Bansuri	Bansuri
65	Erhu	Erhu
66	Suling	Suling
67	Sarod	Sarod
69	Gam	UserDefined
70	Kamanche	Kemenche
75	Tar	UserDefined
76	Tumbuktu	UserDefined
78	Balalaika	Balalaika
79	Dhol	Dhol
80	Raban	UserDefined
82	Tapan	Davul
88	Udu	Udu
95	Morin khuur	UserDefined
96	Pipa	Pipa
97	Shamisen	Shamisen
98	Sheng	Sheng
99	Taiko	Taiko
100	Krar	Lyre
102	Timbales	Timbales
103	Güiro	Guiro
104	Claves	Claves
106	Pica	UserDefined
107	Cuatro	Cuatro
108	Maracas	Maracas
109	Cajón	Cajon
110	Pandeiro	Pandeiro
114	Requinto	Guitar
119	Bandurria	Bandurria
120	Cantar	Voice
121	Quena	Quena
123	Caja	Caja
124	Caja china	WoodBlock
125	Caja de madera	WoodBlock
126	Bombo	Bombo
132	Tambor	Drum
133	Siku	Siku
134	Bombo legüero	BomboLeguero
138	Pandero	UserDefined
139	Panderetas	UserDefined
144	Tres	Tres
146	Cuban Laud	Lute
147	Marimbula	Marimbula
148	Guayo	Guira
150	Changüí bongo	Bongos
153	Tamduque (low)	UserDefined
154	Tamduque (mid)	UserDefined
155	Legude	UserDefined
156	Guataca	UserDefined
157	Mama tambu	UserDefined
158	Vocal	LeadVocalist
159	BG Vocal	GroupBackgroundVocalists
160	Coro	GroupBackgroundVocalists
161	Trompeta China	Suona
162	Quinto	Congas
163	Bombo repique	UserDefined
164	Guitar	Guitar
165	Acoustic Guitar	AcousticGuitar
166	Classical Guitar	NylonStringGuitar
167	Organ	Organ
168	Hammond Organ	HammondOrgan
169	Synthesizer	Synthesizer
170	Harmonica	Harmonica
171	Ekón	Bells
172	Batá	Bata
173	Iyá	Bata
174	Itótele	Bata
175	Okónkolo	Bata
178	Cowbell	Cowbell
179	Tambourine	Tambourine
180	Shaker	Shaker
181	Triangle	Triangle
182	Cabasa	Cabasa
183	Agogô	AgogoBells
185	Güira	Guira
186	Oboe	Oboe
187	Bassoon	Bassoon
188	Piccolo	PiccoloFlute
189	Bass Clarinet	BassClarinet
190	Flugelhorn	Flugelhorn
191	Cornet	Cornet
192	Drum Machine	DrumMachine
193	Programming	UserDefined
195	Baby Bass	BabyBass
196	Clavinet	Clavinet
197	Percussion	\N
\.
SELECT setval(pg_get_serial_sequence('music.instrument', 'id'), (SELECT max(id) FROM music.instrument));

COPY music.role_group (id, name, purpose, sort_order) FROM stdin;
1	Creative & Rights	Authorship and intellectual property ownership (splits).	1
2	Ownership & Legal	Legal control, rights administration, and monetization.	2
3	Performance & Talent	Individuals who perform or oversee the artistic vision.	3
4	Production & Technical	Technical personnel involved in the recording/mixing process.	4
5	Administrative / Other	\N	5
\.
SELECT setval(pg_get_serial_sequence('music.role_group', 'id'), (SELECT max(id) FROM music.role_group));

COPY music.role (id, name, role_group_id, description, ddex_code, credit_role) FROM stdin;
1	Sub-Publisher	1	\N	SubPublisher	f
2	Publisher	1	\N	MusicPublisher	f
3	Arranger	1	\N	Arranger	t
4	Lyricist	1	\N	Lyricist	f
5	Composer	1	\N	Composer	t
6	Distributor	2	i.e. DistroKid etc.	\N	f
7	Attorney	2	\N	\N	f
8	Licensee	2	\N	\N	f
9	Sync Agent	2	\N	\N	f
10	Master Owner	2	\N	RightsController	t
11	Producer	3	\N	StudioProducer	t
12	Musician	3	\N	Musician	t
13	Featured Artist	3	\N	FeaturedArtist	t
14	Artist	3	\N	MainArtist	t
15	Music Supervisor	4	\N	\N	f
16	Atmos Engineer	4	Dolby Atmos / immersive mix	ImmersiveMixingEngineer	t
17	Mastering Engineer	4	\N	MasteringEngineer	t
18	Recording Engineer	4	\N	RecordingEngineer	t
19	Mix Engineer	4	\N	MixingEngineer	t
20	Radio/Social Media	5	\N	\N	f
\.
SELECT setval(pg_get_serial_sequence('music.role', 'id'), (SELECT max(id) FROM music.role));

COPY music.genre (id, name, parent_id, schema_class_id, mo_term) FROM stdin;
63	Blues	\N	\N	Blues
64	Breakbeat	\N	\N	\N
65	Children	\N	\N	\N
66	Classical	\N	\N	\N
67	Comedy	\N	\N	\N
68	Country	\N	\N	\N
69	Dance	\N	\N	\N
70	Adult Alternative	\N	\N	\N
71	Drum and Bass	\N	\N	\N
72	Electronic	\N	\N	\N
73	Folk	\N	\N	\N
74	Hip Hop	\N	\N	\N
75	Indie Folk	\N	\N	\N
76	Indie Pop	\N	\N	\N
77	Jazz	\N	\N	\N
78	Latin	\N	\N	\N
79	Metal	\N	\N	\N
80	New Age	\N	\N	\N
81	Pop	\N	\N	\N
82	Rap	\N	\N	\N
83	Reggae	\N	\N	\N
84	Rock	\N	\N	\N
85	R&B	\N	\N	\N
86	Singer-Songwriter	\N	\N	\N
87	Soul	\N	\N	\N
88	World	\N	\N	\N
89	Funk	\N	\N	\N
90	Cuban Son	\N	\N	\N
91	Reggaeton	\N	\N	\N
92	Cubaton	\N	\N	\N
93	Timba	\N	\N	\N
95	Salsa	\N	\N	\N
96	Latin Pop	\N	\N	\N
97	Bolero	\N	\N	\N
98	Cumbia	\N	\N	\N
99	Punto Guajiro	\N	\N	\N
100	Danza	\N	\N	\N
102	Nueva Trova	\N	\N	\N
103	Folkloric	\N	\N	\N
104	Cha-cha-chá	\N	\N	\N
105	Latin Jazz	\N	\N	\N
106	Guaguancó	\N	\N	\N
107	Bossa Nova	\N	\N	\N
108	Bolero-Son	\N	\N	\N
109	Canción	\N	\N	\N
110	Contradanza	\N	\N	\N
111	Habanera	\N	\N	\N
112	Conga	\N	\N	\N
113	Danzón	\N	\N	\N
114	Criolla	\N	\N	\N
115	Rumba Columbia	\N	\N	\N
116	Clave	\N	\N	\N
117	Criolla-Bolero	\N	\N	\N
118	Romanza Cubana	\N	\N	\N
119	Guajira	\N	\N	\N
120	Mambo	\N	\N	\N
121	Tango-Congo	\N	\N	\N
122	Cinematic	\N	\N	\N
123	Ambient	\N	\N	\N
124	Latin Rock	\N	\N	\N
125	Songo	\N	\N	\N
126	Jazz Fusion	\N	\N	\N
127	Adult Contemporary	\N	\N	\N
128	Ballad	\N	\N	\N
129	Gaga	\N	\N	\N
130	Guaracha	\N	\N	\N
\.
SELECT setval(pg_get_serial_sequence('music.genre', 'id'), (SELECT max(id) FROM music.genre));

COPY music.mood (id, name) FROM stdin;
1	Happy
2	Uplifting
3	Hopeful
4	Joyful
5	Euphoric
6	Triumphant
7	Inspiring
8	Optimistic
9	Playful
10	Carefree
11	Feel Good
12	Celebratory
13	Romantic
14	Sentimental
15	Tender
16	Warm
17	Nostalgic
18	Bittersweet
19	Intimate
20	Heartfelt
21	Wistful
22	Peaceful
23	Relaxing
24	Serene
25	Dreamy
26	Floating
27	Laid Back
28	Smooth
29	Meditative
30	Gentle
31	Hypnotic
32	Ethereal
33	Reflective
34	Introspective
35	Melancholy
36	Somber
37	Sad
38	Lonely
39	Longing
40	Mournful
41	Regretful
42	Suspense
43	Tense
44	Anxious
45	Restless
46	Ominous
47	Dark
48	Mysterious
49	Eerie
50	Scary
51	Fear
52	Unsettling
53	Paranoid
54	Foreboding
55	Epic
56	Dramatic
57	Heroic
58	Cinematic
59	Powerful
60	Determined
61	Confident
62	Bold
63	Majestic
64	Heavy & Ponderous
65	Grand
66	Energetic
67	Driving
68	Aggressive
69	Angry
70	Intense
71	Gritty
72	Rebellious
73	Frantic
74	Urgent
75	Relentless
76	Quirky
77	Funny
78	Weird
79	Eccentric
80	Whimsical
81	Mischievous
82	Silly
83	Awkward
84	Elegant
85	Glamorous
86	Sexy
87	Sophisticated
88	Cool
89	Sultry
90	Sleek
91	Retro
92	Running
93	Marching
94	Chasing
95	Sneaking
96	Busy & Frantic
97	Building
98	Pulsing
99	Soaring
100	Falling
101	Exotic
102	Positive
103	Festive
104	Swagger
105	Bright
\.
SELECT setval(pg_get_serial_sequence('music.mood', 'id'), (SELECT max(id) FROM music.mood));

COPY music.vocal_type (id, name) FROM stdin;
1	Female
2	Male
3	Mixed
4	Group
\.
SELECT setval(pg_get_serial_sequence('music.vocal_type', 'id'), (SELECT max(id) FROM music.vocal_type));

COPY music.audio_file_type (id, name) FROM stdin;
1	Full Mix
2	Instrumental
3	TV Mix
4	A Cappella
5	Clean
6	Radio Edit
7	Alt Mix
8	Underscore
9	15 Second
10	30 Second
11	60 Second
12	Sting
13	Stem
\.
SELECT setval(pg_get_serial_sequence('music.audio_file_type', 'id'), (SELECT max(id) FROM music.audio_file_type));

COPY music.document_type (id, name) FROM stdin;
1	Split Sheet
2	Work for Hire
3	Publishing Agreement
4	Sub-Publishing Agreement
5	Administration Agreement
6	Co-Publishing Agreement
7	Sync License
8	Master Use License
9	Mechanical License
10	One-Stop Clearance
11	Recording Agreement
12	Producer Agreement
13	Session Musician Release
14	Sample Clearance
15	Assignment of Copyright
16	Termination Notice
17	Copyright Registration
18	PRO Registration Confirmation
19	Distribution Agreement
20	Licensing Quote
21	Invoice
22	Royalty Statement
23	Cue Sheet
24	W-9
25	W-8BEN
26	NDA
27	Correspondence
28	Other
29	Collaborators Agreement
30	Track Sheet
31	Production Agreement
32	Cover Art
\.
SELECT setval(pg_get_serial_sequence('music.document_type', 'id'), (SELECT max(id) FROM music.document_type));

COPY music.asset_status (id, name) FROM stdin;
1	Active
2	Inactive
3	Track Completed
6	Needs a Remix
7	Needs Remastering
8	Music Only
9	Track Started
10	Lyrics Only
11	Pitched to Artist
12	Pitched to Music Supervisor
13	Pitched to Publisher
14	Signed
15	Future
16	Needs Revisions
17	Administrative
18	Released
19	Finished
\.
SELECT setval(pg_get_serial_sequence('music.asset_status', 'id'), (SELECT max(id) FROM music.asset_status));

