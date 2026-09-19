import polyglotI18nProvider from 'ra-i18n-polyglot';
import englishMessages from 'ra-language-english';

const messages = {
  ...englishMessages,
  resources: {
    song:              { name: 'Song |||| Songs' },
    recording:         { name: 'Recording |||| Recordings' },
    document:          { name: 'Document |||| Documents' },
    contact:           { name: 'Person |||| People' },
    organization:      { name: 'Company |||| Companies' },
    artist:            { name: 'Artist |||| Artists' },
    artist_member:     { name: 'Artist member |||| Artist members' },

    song_split_check:  { name: 'Split problem |||| Split problems' },
    song_unregistered: { name: 'Unregistered song |||| Unregistered songs' },
    document_expiring: { name: 'Expiring document |||| Expiring documents' },
    document_orphan:   { name: 'Unattached document |||| Unattached documents' },
    email_duplicate:   { name: 'Duplicate email |||| Duplicate emails' },

    country:           { name: 'Country |||| Countries' },
    pro:               { name: 'Society |||| Societies' },
    pro_territory:     { name: 'Society territory |||| Society territories' },
    key_signature:     { name: 'Key signature |||| Key signatures' },
    mood:              { name: 'Mood |||| Moods' },
    instrument:        { name: 'Instrument |||| Instruments' },
    genre:             { name: 'Genre |||| Genres' },
    language:          { name: 'Language |||| Languages' },
    asset_status:      { name: 'Status |||| Statuses' },
    document_type:     { name: 'Document type |||| Document types' },
    role_group:        { name: 'Role group |||| Role groups' },
    role:              { name: 'Role |||| Roles' },
    vocabulary:        { name: 'Vocabulary |||| Vocabularies' },
    schema_type:       { name: 'Schema type |||| Schema types' },
    account_storage:   { name: 'Storage setting |||| Storage settings' },
  },
};

export const i18nProvider = polyglotI18nProvider(() => messages, 'en');