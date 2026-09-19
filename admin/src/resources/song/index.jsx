import { Edit, Create, TabbedForm } from 'react-admin';
import { EditToolbar } from '../formToolbar';
import { DocumentsInput } from '../documentsTab';

import SongList from './SongList';
import DetailsFields from './tabs/Details';
import WritersFields from './tabs/Writers';
import PublishersFields from './tabs/Publishers';
import RegistrationsFields from './tabs/Registrations';
import AltTitlesFields from './tabs/AltTitles';
import CopyrightFields from './tabs/Copyright';
import LyricsFields from './tabs/Lyrics';
import NotesFields from './tabs/Notes';

// TabbedForm reads its direct children to build the tab bar, so the
// Tab shells have to stay here. Each tab's contents live in its own file.
const SongForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">       <DetailsFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Writers">       <WritersFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Publishers">    <PublishersFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Registrations"> <RegistrationsFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Alt titles">    <AltTitlesFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Copyright">     <CopyrightFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Lyrics">        <LyricsFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Notes">         <NotesFields /></TabbedForm.Tab>
    <TabbedForm.Tab label="Documents">     <DocumentsInput /></TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ writer_total, publisher_total,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: SongList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><SongForm /></Edit>,
  create: () => <Create transform={strip}><SongForm /></Create>,
  recordRepresentation: 'title',
};
