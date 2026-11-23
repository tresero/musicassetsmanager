import { Admin, Resource, CustomRoutes, defaultTheme } from 'react-admin';
import { BrowserRouter, Route } from 'react-router';
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
import recordingUnregistered from './resources/recordingUnregistered';
import documentExpiring from './resources/documentExpiring';
import emailDuplicate from './resources/emailDuplicate';
import deletedRecord from './resources/deletedRecord';

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
import fileUnnamed from './resources/fileUnnamed';
import accountUser from './resources/accountUser';
import accountInvite from './resources/accountInvite';
import siteAccount from './resources/siteAccount';
import accountRole from './resources/accountRole';
import siteSetting from './resources/siteSetting';
import statement from './resources/statement';
import statementLine from './resources/statementLine';
import accountSetting from './resources/accountSetting';
import transaction, { transactionCategory } from './resources/transaction';
import { sharedList } from './resources/shared';

const nameList = sharedList();

const theme = {
  ...defaultTheme,
  components: {
    ...defaultTheme.components,
    MuiTextField:   { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    // A form's tabs scroll within their bar on a narrow screen instead of
    // widening the whole page (react-admin's layout grows to fit its widest
    // content).
    MuiTabs: { defaultProps: { variant: 'scrollable', scrollButtons: 'auto', allowScrollButtonsMobile: true } },
    // React Admin's layout is at least as wide as its widest content
    // (minWidth: fit-content), so one wide piece, such as a form's tab bar,
    // widens the whole page and it scrolls sideways. Fit the window instead;
    // wide pieces scroll within themselves.
    RaLayout: {
      styleOverrides: {
        root: { minWidth: 0, '& .RaLayout-content': { minWidth: 0 } },
      },
    },
    // A table wider than the window scrolls sideways within its own box, and
    // the list around it stays the window's width.
    RaList: { styleOverrides: { root: { '& .RaList-main': { minWidth: 0 } } } },
    RaDataTable: { styleOverrides: { root: { overflowX: 'auto', maxWidth: '100%' } } },
    RaDatagrid: { styleOverrides: { root: { overflowX: 'auto', maxWidth: '100%' } } },
    // A toolbar's buttons (a list's Columns, filters, Create and Export) wrap
    // onto another line rather than widening the page.
    RaTopToolbar: { styleOverrides: { root: { flexWrap: 'wrap' } } },
    // React Admin hides each list row's remove button until hover.
    RaSimpleFormIterator: {
      styleOverrides: {
        root: { '& .RaSimpleFormIterator-action': { visibility: 'visible' } },
      },
    },
  },
};

export default function App() {
  // Real paths, /song/agarra-lo-tuyo, rather than /#/song/52 (#60). Caddy
  // serves index.html for any path that is not a file.
  return (
    <BrowserRouter>
    <Admin dataProvider={dataProvider} authProvider={authProvider}
           theme={theme} i18nProvider={i18nProvider} layout={AppLayout}>
      {(permissions) => {
        // A role that may not add gets no create page, so no Create buttons.
        const addable = (code) => (def) =>
          can(permissions, code) ? def : { ...def, create: undefined };
        const catalog = addable('catalog.edit');
        const settings = addable('settings.edit');
        const money = addable('money.edit');
        // Matching a statement line by hand is its edit page.
        const moneyEdit = (def) =>
          can(permissions, 'money.edit') ? def : { ...def, edit: undefined };
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
      <Resource name="recording_unregistered" {...recordingUnregistered} />
      <Resource name="document_expiring" {...documentExpiring} />
      <Resource name="email_duplicate" {...emailDuplicate} />
      <Resource name="deleted_record" {...deletedRecord} />

      <Resource name="statement" {...moneyEdit(money(statement))} />
      <Resource name="statement_line" {...moneyEdit(statementLine)} />
      <Resource name="transaction" {...moneyEdit(money(transaction))} />
      <Resource name="transaction_category" {...moneyEdit(money(transactionCategory))} />
      <Resource name="account_setting" {...moneyEdit(accountSetting)} />

      <Resource name="country" {...shared(country)} />
      <Resource name="pro" {...pro} />
      <Resource name="pro_territory" {...proTerritory} />
      <Resource name="key_signature" {...shared(keySignature)} />
      <Resource name="mood" {...shared(nameList)} />
      <Resource name="theme" {...shared(nameList)} />
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
      <Resource name="user_mail" />
      <Resource name="document_orphan" {...documentOrphan} />
      <Resource name="file_unnamed" {...fileUnnamed} />
      <Resource name="account_user" {...accountUser} />
      <Resource name="account_invite" {...accountInvite} />
      <Resource name="account_role" {...(permissions?.site_admin ? accountRole : { recordRepresentation: 'name' })} />
      <Resource name="permission" recordRepresentation="description" />
      {permissions?.site_admin && <Resource name="site_account" {...siteAccount} />}
      <Resource name="site_setting" {...(permissions?.site_admin ? siteSetting : {})} />
      <CustomRoutes noLayout>
        <Route path="/accept-invite" element={<AcceptInvite />} />
      </CustomRoutes>
        </>);
      }}
    </Admin>
    </BrowserRouter>
  );
}
