import { Admin, Resource } from 'react-admin';
import dataProvider from './dataProvider';
import authProvider from './authProvider';

import country from './resources/country';
import pro from './resources/pro';
import proTerritory from './resources/proTerritory';
import keySignature from './resources/keySignature';
import mood from './resources/mood';
import instrument from './resources/instrument';
import genre from './resources/genre';
import language from './resources/language';
import assetStatus from './resources/assetStatus';
import roleGroup from './resources/roleGroup';
import role from './resources/role';
import vocabulary from './resources/vocabulary';
import schemaType from './resources/schemaType';

import contact from './resources/contact';
import organization from './resources/organization';
import artist from './resources/artist';
import artistMember from './resources/artistMember';
import emailDuplicate from './resources/emailDuplicate';

import song from './resources/song';
import songSplitCheck from './resources/songSplitCheck';
import songUnregistered from './resources/songUnregistered';

export default function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider}>
      <Resource name="song" {...song} />
      <Resource name="contact" {...contact} />
      <Resource name="organization" {...organization} />
      <Resource name="artist" {...artist} />
      <Resource name="artist_member" {...artistMember} />

      <Resource name="song_split_check" {...songSplitCheck} />
      <Resource name="song_unregistered" {...songUnregistered} />
      <Resource name="email_duplicate" {...emailDuplicate} />

      <Resource name="country" {...country} />
      <Resource name="pro" {...pro} />
      <Resource name="pro_territory" {...proTerritory} />
      <Resource name="key_signature" {...keySignature} />
      <Resource name="mood" {...mood} />
      <Resource name="instrument" {...instrument} />
      <Resource name="genre" {...genre} />
      <Resource name="language" {...language} />
      <Resource name="asset_status" {...assetStatus} />
      <Resource name="role_group" {...roleGroup} />
      <Resource name="role" {...role} />
      <Resource name="vocabulary" {...vocabulary} />
      <Resource name="schema_type" {...schemaType} />
    </Admin>
  );
}