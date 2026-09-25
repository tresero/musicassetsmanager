import { useState } from 'react';
import { Menu, Layout, useSidebarState } from 'react-admin';
import {
  ListSubheader, ListItemButton, ListItemText, Collapse, Divider,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const Heading = ({ children }) => {
  const [open] = useSidebarState();
  if (!open) return <Divider sx={{ my: 1 }} />;
  return (
    <ListSubheader disableSticky sx={{ lineHeight: '32px', mt: 1, bgcolor: 'transparent' }}>
      {children}
    </ListSubheader>
  );
};

// Reference lists are edited rarely, so they stay folded until asked for.
const Folded = ({ label, children }) => {
  const [sidebarOpen] = useSidebarState();
  const [open, setOpen] = useState(false);
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

export const AppMenu = () => (
  <Menu>
    <Heading>Catalog</Heading>
    <Menu.ResourceItem name="song" />
    <Menu.ResourceItem name="recording" />
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

    <Folded label="Lists">
      <Menu.ResourceItem name="audio_file_type" />
      <Menu.ResourceItem name="document_type" />
      <Menu.ResourceItem name="asset_status" />
      <Menu.ResourceItem name="role" />
      <Menu.ResourceItem name="role_group" />
      <Menu.ResourceItem name="instrument" />
      <Menu.ResourceItem name="genre" />
      <Menu.ResourceItem name="mood" />
      <Menu.ResourceItem name="key_signature" />
      <Menu.ResourceItem name="language" />
      <Menu.ResourceItem name="country" />
      <Menu.ResourceItem name="pro" />
      <Menu.ResourceItem name="pro_territory" />
      <Menu.ResourceItem name="vocabulary" />
      <Menu.ResourceItem name="schema_type" />
    </Folded>

    <Heading>Settings</Heading>
    <Menu.ResourceItem name="account_storage" />
  </Menu>
);

export const AppLayout = (props) => <Layout {...props} menu={AppMenu} />;
