import { Admin, Resource, CustomRoutes, defaultTheme } from 'react-admin';
import { Route } from 'react-router';
import dataProvider from './dataProvider';
import authProvider from './authProvider';
import { i18nProvider } from './i18n';
import { AppLayout } from './AppMenu';
import { can } from './permissions';
import AcceptInvite from './AcceptInvite';

import song from './resources/song';
import recording from './resources/recording';
import release from './resources/release';
import contact from './resources/contact';
import organization from './resources/organization';
import artist from './resources/artist';
import artistMember from './resources/artistMember';
import document from './resources/document';

import songSplitCheck from './resources/songSplitCheck';
import songUnregistered from './resources/songUnregistered';
import documentExpiring from './resources/documentExpiring';
import emailDuplicate from './resources/emailDuplicate';

import country from './resources/country';
import pro from './resources/pro';
import proTerritory from './resources/proTerritory';
import keySignature from './resources/keySignature';
import genre from './resources/genre';
import language from './resources/language';
import pitchSetting from './resources/pitchSetting';
import userPreference from './resources/userPreference';
import roleGroup from './resources/roleGroup';
import role from './resources/role';
import vocabulary from './resources/vocabulary';
import schemaType from './resources/schemaType';
import accountStorage from './resources/accountStorage';
import documentOrphan from './resources/documentOrphan';
import accountUser from './resources/accountUser';
import accountInvite from './resources/accountInvite';
import { sharedList } from './resources/shared';

const nameList = sharedList();

const theme = {
  ...defaultTheme,
  components: {
    ...defaultTheme.components,
    MuiTextField:   { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    // React Admin hides each list row's remove button until hover.
    RaSimpleFormIterator: {
      styleOverrides: {
        root: { '& .RaSimpleFormIterator-action': { visibility: 'visible' } },
      },
    },
  },
};

export default function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider}
           theme={theme} i18nProvider={i18nProvider} layout={AppLayout}>
      {(permissions) => {
        // A role that may not add gets no create page, so no Create buttons.
        const addable = (code) => (def) =>
          can(permissions, code) ? def : { ...def, create: undefined };
        const catalog = addable('catalog.edit');
        const settings = addable('settings.edit');
        // Only the site admin gets edit and create pages for the shared lists.
        const shared = (def) =>
          permissions?.site_admin ? def : { ...def, edit: undefined, create: undefined };
        return (<>
      <Resource name="song" {...catalog(song)} />
      <Resource name="recording" {...catalog(recording)} />
      <Resource name="release" {...catalog(release)} />
      <Resource name="document" {...catalog(document)} />
      <Resource name="contact" {...catalog(contact)} />
      <Resource name="organization" {...catalog(organization)} />
      <Resource name="artist" {...catalog(artist)} />
      <Resource name="artist_member" {...catalog(artistMember)} />

      <Resource name="song_split_check" {...songSplitCheck} />
      <Resource name="song_unregistered" {...songUnregistered} />
      <Resource name="document_expiring" {...documentExpiring} />
      <Resource name="email_duplicate" {...emailDuplicate} />

      <Resource name="country" {...shared(country)} />
      <Resource name="pro" {...pro} />
      <Resource name="pro_territory" {...proTerritory} />
      <Resource name="key_signature" {...shared(keySignature)} />
      <Resource name="mood" {...shared(nameList)} />
      <Resource name="instrument" {...shared(nameList)} />
      <Resource name="genre" {...shared(genre)} />
      <Resource name="language" {...shared(language)} />
      <Resource name="asset_status" {...shared(nameList)} />
      <Resource name="document_type" {...shared(nameList)} />
      <Resource name="audio_file_type" {...shared(nameList)} />
      <Resource name="vocal_type" {...shared(nameList)} />
      <Resource name="role_group" {...shared(roleGroup)} />
      <Resource name="role" {...shared(role)} />
      <Resource name="vocabulary" {...shared(vocabulary)} />
      <Resource name="schema_type" {...schemaType} />
      <Resource name="account_storage" {...settings(accountStorage)} />
      <Resource name="pitch_setting" {...settings(pitchSetting)} />
      <Resource name="user_preference" {...userPreference} />
      <Resource name="document_orphan" {...documentOrphan} />
      <Resource name="account_user" {...accountUser} />
      <Resource name="account_invite" {...accountInvite} />
      <Resource name="account_role" recordRepresentation="name" />
      <CustomRoutes noLayout>
        <Route path="/accept-invite" element={<AcceptInvite />} />
      </CustomRoutes>
        </>);
      }}
    </Admin>
  );
}
