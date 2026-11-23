import { Children, useState } from 'react';
import { useLocation } from 'react-router';
import { Menu, Layout, useSidebarState } from 'react-admin';
import {
  ListSubheader, ListItemButton, ListItemText, Collapse, Divider,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useCan, useIsSiteAdmin } from './permissions';

const Heading = ({ children }) => {
  const [open] = useSidebarState();
  if (!open) return <Divider sx={{ my: 1 }} />;
  return (
    <ListSubheader disableSticky sx={{ lineHeight: '32px', mt: 1, bgcolor: 'transparent' }}>
      {children}
    </ListSubheader>
  );
};

// A section folded until asked for, such as Reports and the shared lists.
// It starts open when the page shown is one of its own.
const Folded = ({ label, children }) => {
  const [sidebarOpen] = useSidebarState();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => Children.toArray(children)
    .some((c) => c.props?.name && pathname.startsWith(`/${c.props.name}`)));
  return (
    <>
      <ListItemButton onClick={() => setOpen(!open)} dense sx={{ mt: 1 }}>
        {sidebarOpen && <ListItemText primary={label}
                                      primaryTypographyProps={{ variant: 'overline' }} />}
        {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} unmountOnExit>{children}</Collapse>
    </>
  );
};

export const AppMenu = () => {
  const canSettings = useCan('settings.edit');
  const canUsers = useCan('users.manage');
  const canMoney = useCan('money.view');
  const siteAdmin = useIsSiteAdmin();
  return (
    <Menu>
      <Heading>Catalog</Heading>
      <Menu.ResourceItem name="song" />
      <Menu.ResourceItem name="recording" />
      <Menu.ResourceItem name="release" />
      <Menu.ResourceItem name="artist" />
      <Menu.ResourceItem name="contact" />
      <Menu.ResourceItem name="organization" />
      <Menu.ResourceItem name="document" />

      {canMoney && <Heading>Money</Heading>}
      {canMoney && <Menu.ResourceItem name="statement" />}
      {canMoney && <Menu.ResourceItem name="statement_line" />}
      {canMoney && <Menu.ResourceItem name="transaction" />}
      {canMoney && <Menu.ResourceItem name="transaction_category" />}
      {canMoney && <Menu.ResourceItem name="account_setting" />}

      <Folded label="Reports">
        <Menu.ResourceItem name="song_split_check" />
        <Menu.ResourceItem name="song_unregistered" />
        <Menu.ResourceItem name="recording_unregistered" />
        <Menu.ResourceItem name="document_expiring" />
        <Menu.ResourceItem name="document_orphan" />
        <Menu.ResourceItem name="file_unnamed" />
        <Menu.ResourceItem name="email_duplicate" />
        <Menu.ResourceItem name="deleted_record" />
      </Folded>

      {siteAdmin && <Folded label="Lists">
        <Menu.ResourceItem name="audio_file_type" />
        <Menu.ResourceItem name="vocal_type" />
        <Menu.ResourceItem name="document_type" />
        <Menu.ResourceItem name="asset_status" />
        <Menu.ResourceItem name="role" />
        <Menu.ResourceItem name="role_group" />
        <Menu.ResourceItem name="instrument" />
        <Menu.ResourceItem name="genre" />
        <Menu.ResourceItem name="mood" />
        <Menu.ResourceItem name="theme" />
        <Menu.ResourceItem name="key_signature" />
        <Menu.ResourceItem name="language" />
        <Menu.ResourceItem name="country" />
        <Menu.ResourceItem name="pro" />
        <Menu.ResourceItem name="pro_territory" />
        <Menu.ResourceItem name="vocabulary" />
        <Menu.ResourceItem name="schema_type" />
      </Folded>}

      <Heading>Settings</Heading>
      <Menu.ResourceItem name="user_preference" />
      {canSettings && <Menu.ResourceItem name="account_storage" />}
      {canSettings && <Menu.ResourceItem name="pitch_setting" />}
      {canSettings && <Menu.ResourceItem name="account_mail" />}
      {canUsers && <Menu.ResourceItem name="account_user" />}
      {canUsers && <Menu.ResourceItem name="account_invite" />}
      {siteAdmin && <Menu.ResourceItem name="site_account" />}
      {siteAdmin && <Menu.ResourceItem name="account_role" />}
      {siteAdmin && <Menu.ResourceItem name="site_setting" />}
    </Menu>
  );
};

export const AppLayout = (props) => <Layout {...props} menu={AppMenu} />;
