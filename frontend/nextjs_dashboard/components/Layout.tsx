/**
 * Main layout component for the TalentTriage dashboard
 * 
 * This component provides the common layout structure for all pages,
 * including the app bar, navigation drawer, and main content area.
 */
import React, { ReactNode, useState } from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Define props interface for the Layout component
interface LayoutProps {
  children: ReactNode;
  title?: string;
}

// Drawer width constant
const drawerWidth = 240;

/**
 * Layout component that wraps all pages
 * 
 * @param children - Page content
 * @param title - Page title
 */
const Layout: React.FC<LayoutProps> = ({ children, title = 'TalentTriage' }) => {
  // State for mobile drawer toggle
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Navigation items
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, href: '/' },
    { text: 'Jobs', icon: <WorkIcon />, href: '/jobs' },
    { text: 'Candidates', icon: <PersonIcon />, href: '/candidates' },
    { text: 'Resumes', icon: <DescriptionIcon />, href: '/resumes' },
  ];

  // Drawer content
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          TalentTriage
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <Link href={item.href} key={item.text} passHref style={{ textDecoration: 'none', color: 'inherit' }}>
            <ListItem disablePadding>
              <ListItemButton selected={router.pathname === item.href}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          </Link>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation menu"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Account for AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
