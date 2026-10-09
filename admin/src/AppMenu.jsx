import { Menu, Layout, useSidebarState } from 'react-admin';
import { ListSubheader, Divider } from '@mui/material';

const Heading = ({ children }) => {
  const [open] = useSidebarState();
  if (!open) return <Divider sx={{ my: 1 }} />;
  return (
    <ListSubheader disableSticky sx={{ lineHeight: '32px', mt: 1, bgcolor: 'transparent' }}>
      {children}
    </ListSubheader>
  );
};

export const AppMenu = () => (
  <Menu>
    <Heading>Catalog</Heading>
    <Menu.ResourceItem name="song" />
    <Menu.ResourceItem name="recording" />
    <Menu.ResourceItem name="release" />
    <Menu.ResourceItem name="artist" />
    <Menu.ResourceItem name="contact" />
    <Menu.ResourceItem name="organization" />
    <Menu.ResourceItem name="document" />

    <Heading>Reports</Heading>
    <Menu.ResourceItem name="song_split_check" />
    <Menu.ResourceItem name="song_unregistered" />
    <Menu.ResourceItem name="document_expiring" />
    <Menu.ResourceItem name="document_orphan" />
    <Menu.ResourceItem name="email_duplicate" />

    <Heading>Settings</Heading>
    <Menu.ResourceItem name="account_storage" />
    <Menu.ResourceItem name="pitch_setting" />
  </Menu>
);

export const AppLayout = (props) => <Layout {...props} menu={AppMenu} />;
