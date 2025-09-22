import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Divider,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  QueryStats,
  Search,
  MoreVert,
  Delete,
  Edit,
  Share,
  Visibility,
  DateRange,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getMyAnalyses, deleteAnalysis, updateAnalysis } from '../services/analytics';
import { Analysis } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const MyPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 제목에서 "데이터 분석:" 접두사 제거하는 함수
  const cleanTitle = (title: string) => {
    return title.replace(/^데이터\s*분석\s*:\s*/i, '').trim();
  };

  useEffect(() => {
    loadAnalyses();
    
    // 네비게이션 state에서 메시지 처리
    if (location.state?.message) {
      setSnackbar({
        open: true,
        message: location.state.message,
        severity: location.state.severity || 'info'
      });
      
      // state 클리어 (뒤로가기 시 메시지 재표시 방지)
      navigate(location.pathname, { replace: true });
    }
  }, []);

  useEffect(() => {
    filterAnalyses();
  }, [analyses, searchQuery, tabValue]);

  const loadAnalyses = async () => {
    try {
      const response = await getMyAnalyses(1, 100); // Load all for now
      setAnalyses(response.analyses);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAnalyses = () => {
    let filtered = analyses;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (analysis) =>
          analysis.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (analysis.title && analysis.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (analysis.tags && analysis.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }

    // Filter by tab
    switch (tabValue) {
      case 1: // Recent
        filtered = filtered.filter(
          (analysis) =>
            new Date(analysis.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 2: // Shared
        filtered = filtered.filter((analysis) => analysis.isPublic);
        break;
    }

    setFilteredAnalyses(filtered);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, analysis: Analysis) => {
    setAnchorEl(event.currentTarget);
    setSelectedAnalysis(analysis);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAnalysis(null);
  };

  const handleViewAnalysis = (analysis: Analysis) => {
    navigate(`/analysis/${analysis.id}`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedAnalysis) {
      try {
        await deleteAnalysis(selectedAnalysis.id);
        
        // 로컬 상태에서 즉시 제거
        setAnalyses(analyses.filter((a) => a.id !== selectedAnalysis.id));
        
        // 목록을 다시 로드하여 확실히 동기화
        await loadAnalyses();
        
        setSnackbar({
          open: true,
          message: '분석이 성공적으로 삭제되었습니다.',
          severity: 'success'
        });
        setDeleteDialogOpen(false);
        setSelectedAnalysis(null);
      } catch (error) {
        console.error('Failed to delete analysis:', error);
        
        // 에러가 발생해도 로컬에서는 삭제 시도
        setAnalyses(analyses.filter((a) => a.id !== selectedAnalysis.id));
        await loadAnalyses();
        
        setSnackbar({
          open: true,
          message: '분석이 삭제되었지만 서버 동기화에 문제가 있을 수 있습니다.',
          severity: 'warning'
        });
        setDeleteDialogOpen(false);
        setSelectedAnalysis(null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedAnalysis(null);
  };

  const handleShareToggle = async () => {
    if (selectedAnalysis) {
      try {
        await updateAnalysis(selectedAnalysis.id, {
          isPublic: !selectedAnalysis.isPublic,
        });
        setAnalyses(
          analyses.map((a) =>
            a.id === selectedAnalysis.id ? { ...a, isPublic: !a.isPublic } : a
          )
        );
        setSnackbar({
          open: true,
          message: selectedAnalysis.isPublic ? '공유가 해제되었습니다.' : '분석이 공유되었습니다.',
          severity: 'success'
        });
        handleMenuClose();
      } catch (error) {
        console.error('Failed to update analysis:', error);
        setSnackbar({
          open: true,
          message: '공유 설정 변경에 실패했습니다. 다시 시도해주세요.',
          severity: 'error'
        });
        handleMenuClose();
      }
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getAnalysisStats = () => {
    const totalAnalyses = analyses.length;
    const recentAnalyses = analyses.filter(
      (analysis) =>
        new Date(analysis.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    const sharedAnalyses = analyses.filter((analysis) => analysis.isPublic).length;

    return { totalAnalyses, recentAnalyses, sharedAnalyses };
  };

  const stats = getAnalysisStats();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        마이페이지
      </Typography>

      {/* User Profile Section */}
      <Card sx={{ 
        mb: 3,
        background: '#1e293b',
        color: 'white',
        border: '1px solid #334155'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar sx={{ width: 80, height: 80, fontSize: '2rem' }}>
              {user?.name?.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5">{user?.name}</Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.employeeId} | {user?.department}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                마지막 로그인: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('ko-KR') : '정보 없음'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, maxWidth: 400 }}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center', 
                flex: 1,
                background: '#0f172a',
                color: '#f3f4f6',
                border: '1px solid #334155'
              }}>
                <Typography variant="h6" sx={{ color: '#f3f4f6' }}>{stats.totalAnalyses}</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>총 분석</Typography>
              </Paper>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center', 
                flex: 1,
                background: '#0f172a',
                color: '#f3f4f6',
                border: '1px solid #334155'
              }}>
                <Typography variant="h6" sx={{ color: '#f3f4f6' }}>{stats.recentAnalyses}</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>최근 1주</Typography>
              </Paper>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center', 
                flex: 1,
                background: '#0f172a',
                color: '#f3f4f6',
                border: '1px solid #334155'
              }}>
                <Typography variant="h6" sx={{ color: '#f3f4f6' }}>{stats.sharedAnalyses}</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>공유된 분석</Typography>
              </Paper>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Analyses Section */}
      <Card sx={{
        background: '#1e293b',
        color: 'white',
        border: '1px solid #334155'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">내 분석 목록</Typography>
            <TextField
              size="small"
              placeholder="분석 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="전체" />
            <Tab label="최근 7일" />
            <Tab label="공유된 분석" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <AnalysisList
              analyses={filteredAnalyses}
              onView={handleViewAnalysis}
              onMenuOpen={handleMenuOpen}
              cleanTitle={cleanTitle}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <AnalysisList
              analyses={filteredAnalyses}
              onView={handleViewAnalysis}
              onMenuOpen={handleMenuOpen}
              cleanTitle={cleanTitle}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <AnalysisList
              analyses={filteredAnalyses}
              onView={handleViewAnalysis}
              onMenuOpen={handleMenuOpen}
              cleanTitle={cleanTitle}
            />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewAnalysis(selectedAnalysis!)}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          상세 보기
        </MenuItem>
        <MenuItem onClick={handleShareToggle}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          {selectedAnalysis?.isPublic ? '공유 해제' : '공유하기'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          삭제
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          분석 삭제 확인
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {selectedAnalysis && (
              <>
                <strong>{cleanTitle(selectedAnalysis.title || selectedAnalysis.query.substring(0, 50) + (selectedAnalysis.query.length > 50 ? '...' : ''))}</strong> 분석을 정말 삭제하시겠습니까?
                <br /><br />
                <strong>이 작업은 되돌릴 수 없습니다.</strong>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            취소
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

interface AnalysisListProps {
  analyses: Analysis[];
  onView: (analysis: Analysis) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, analysis: Analysis) => void;
  cleanTitle: (title: string) => string;
}

const AnalysisList: React.FC<AnalysisListProps> = ({ analyses, onView, onMenuOpen, cleanTitle }) => {
  if (analyses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          분석이 없습니다.
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }} href="/search">
          첫 번째 분석 시작하기
        </Button>
      </Box>
    );
  }

  return (
    <List>
      {analyses.map((analysis) => (
        <ListItem
          key={analysis.id}
          component="div"
          sx={{ 
            border: 1, 
            borderColor: '#334155', 
            borderRadius: 1, 
            mb: 1, 
            cursor: 'pointer',
            background: '#0f172a',
            '&:hover': {
              background: '#1e293b'
            }
          }}
          onClick={() => onView(analysis)}
        >
          <ListItemIcon>
            <QueryStats />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {cleanTitle(analysis.title || analysis.query)}
                {analysis.isPublic && <Share fontSize="small" color="primary" />}
              </Box>
            }
            secondary={
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {analysis.query.length > 100 ? `${analysis.query.substring(0, 100)}...` : analysis.query}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <DateRange fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    {new Date(analysis.createdAt).toLocaleDateString('ko-KR')}
                  </Typography>
                  {analysis.tags?.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              onClick={(e) => {
                e.stopPropagation();
                onMenuOpen(e, analysis);
              }}
            >
              <MoreVert />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default MyPage;