import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Button,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  Person,
  Share,
  Psychology,
  Analytics,
  Logout,
  Settings,
  ImageSearch,
  AutoAwesome,
  Chat,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { Forum } from "@mui/icons-material";
import ChatbotPopup from "../ChatbotPopup";

const drawerWidth = 240;

interface MenuItemType {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const menuItems: MenuItemType[] = [
  { text: "대시보드", icon: <Dashboard />, path: "/dashboard" },
  { text: "데이터 분석", icon: <Psychology />, path: "/analysis" },
  { text: "공유 데이터", icon: <Share />, path: "/shared" },
  { text: "이미지 검색", icon: <ImageSearch />, path: "/image-search" },
  { text: "AI 패션 모델링", icon: <AutoAwesome />, path: "/fashion-modeling" },
  { text: "부서 워크 보드", icon: <Forum />, path: "/boards/MD" },
  { text: "마이페이지", icon: <Person />, path: "/mypage" },
];

const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 컴포넌트 마운트 시 사용자 정보 새로고침
  useEffect(() => {
    console.log("AppLayout - Current user:", user);
    if (refreshUser) {
      refreshUser().catch(console.error);
    }
  }, []);

  useEffect(() => {
    console.log("AppLayout - User updated:", user);
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate("/login");
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Analytics color="primary" />
          <Typography variant="h6" noWrap>
            Analytics
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleMenuItemClick(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* AI 챗봇 버튼 - 하단에 고정 */}
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          p: 2,
          textAlign: "center",
        }}
      >
        <Button
          variant="contained"
          onClick={() => setChatbotOpen(true)}
          sx={{
            bgcolor: "#4caf50",
            color: "white",
            borderRadius: 3,
            px: 3,
            py: 1.5,
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: "0 4px 16px rgba(76, 175, 80, 0.4)",
            "&:hover": {
              bgcolor: "#45a049",
              transform: "translateY(-2px)",
              boxShadow: "0 6px 20px rgba(76, 175, 80, 0.5)",
            },
            transition: "all 0.3s ease",
          }}
          startIcon={<Chat />}
        >
          AI 상담
        </Button>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
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
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            NLP Analytics Platform
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip
              label={user?.department || "부서 미설정"}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.name?.charAt(0) || "U"}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
            mt: 1.5,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Avatar />
          <Box>
            <Typography variant="subtitle2">
              {user?.name || "이름 없음"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.employeeId || "사번 없음"} •{" "}
              {user?.department || "부서 없음"}
            </Typography>
            {user?.email && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {user.email}
              </Typography>
            )}
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => navigate("/settings")}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          설정
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          로그아웃
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* 챗봇 팝업 */}
      <ChatbotPopup open={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </Box>
  );
};

export default AppLayout;
