import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchProducts } from "../services/api";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Avatar,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  CompareArrows as CompareArrowsIcon,
  LocationOn as LocationOnIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  // 홈페이지와 동일한 브랜드 컬러
  const brandColor = '#4A90E2';

  // URL params
  const queryParams = new URLSearchParams(location.search);
  const queryFromUrl = queryParams.get("q") || "";
  const locationFromUrl = queryParams.get("location") || "용답동";

  // State
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [selectedLocation] = useState(locationFromUrl);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [selectedSources, setSelectedSources] = useState([
    "danggeun",
    "coupang",
    "bunjang",
    "junggonara",
  ]);
  const [sortBy, setSortBy] = useState("price_asc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { label: "전체", value: null, emoji: "🔍" },
    { label: "당근마켓", value: "danggeun", emoji: "🥕" },
    { label: "번개장터", value: "bunjang", emoji: "⚡" },
    { label: "중고나라", value: "junggonara", emoji: "💼" },
  ];

  // Format price
  const formatPrice = (value) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })
      .format(value)
      .replace("₩", "") + "원";

  // Source labels + colors
  const getSourceName = (src) =>
    ({ danggeun: "당근마켓", bunjang: "번개장터", junggonara: "중고나라" }[src] ||
    src);
  
  const getSourceColor = (src) => {
    const colors = {
      danggeun: "#FF6F0F",
      coupang: "#0074E4", 
      bunjang: "#FF6B6B",
      junggonara: "#51C878",
    };
    return colors[src] || brandColor;
  };

  // Parse include/exclude tokens
  const tokens = keywordFilter.split(/[,\s]+/).filter((t) => t);
  const includeKeys = tokens.filter((t) => t.startsWith("+")).map((t) => t.slice(1));
  const excludeKeys = tokens.filter((t) => t.startsWith("-")).map((t) => t.slice(1));

  // Perform search
  const doSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { products: items } = await searchProducts(
        searchQuery,
        selectedSources,
        priceRange[0],
        priceRange[1]
      );
      setProducts(items);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      setError("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&location=${selectedLocation}`);
      doSearch();
    }
  };

  // Handlers
  const handleTabChange = (_, v) => setActiveTab(v);
  const handlePriceChange = (_, val) => setPriceRange(val);
  const handleSourceChange = (e) => setSelectedSources(e.target.value);
  const handleSortChange = (e) => setSortBy(e.target.value);

  // Compare selection
  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const goCompare = () => navigate(`/compare?ids=${selectedIds.join(",")}`);

  // Filter & sort
  const filtered = products
    // by tab
    .filter((p) => (activeTab === 0 ? true : p.source === tabs[activeTab].value))
    // by source multiselect
    .filter((p) => selectedSources.includes(p.source))
    // by price
    .filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    // include keywords
    .filter((p) => includeKeys.every((k) => p.title.includes(k)))
    // exclude keywords
    .filter((p) => excludeKeys.every((k) => !p.title.includes(k)));

  const sorted = [...filtered].sort((a, b) =>
    sortBy === "price_asc" ? a.price - b.price : b.price - a.price
  );

  // Initial search
  useEffect(() => {
    if (queryFromUrl) doSearch();
  }, [queryFromUrl]);

  return (
    <Box sx={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}>
      {/* 헤더 섹션 - 홈페이지와 통일 */}
      <Paper elevation={0} sx={{ backgroundColor: "white", py: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Box 
              sx={{ display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              <Avatar sx={{ bgcolor: brandColor, width: 35, height: 35 }}>
                🔍
              </Avatar>
              <Typography variant="h6" fontWeight="bold" color={brandColor}>
                더나와
              </Typography>
            </Box>
            
            <Chip
              icon={<LocationOnIcon />}
              label={selectedLocation}
              sx={{
                backgroundColor: alpha(brandColor, 0.1),
                color: brandColor,
              }}
            />
          </Box>

          {/* 검색 바 */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="찾고 있는 상품을 검색해보세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: 3,
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: brandColor,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: brandColor,
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" sx={{ color: brandColor }}>
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={doSearch}
                  disabled={loading}
                  sx={{
                    backgroundColor: brandColor,
                    borderRadius: 3,
                    py: 1.5,
                    "&:hover": { backgroundColor: "#3A7BC8" },
                  }}
                >
                  검색
                </Button>
              </Grid>
              <Grid item xs={6} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={<TuneIcon />}
                  sx={{
                    borderColor: brandColor,
                    color: brandColor,
                    borderRadius: 3,
                    py: 1.5,
                    "&:hover": { 
                      borderColor: brandColor,
                      backgroundColor: alpha(brandColor, 0.05),
                    },
                  }}
                >
                  필터
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* 비교 버튼 */}
          {selectedIds.length >= 2 && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CompareArrowsIcon />}
                onClick={goCompare}
                sx={{
                  backgroundColor: "#FF6B6B",
                  borderRadius: 3,
                  "&:hover": { backgroundColor: "#FF5252" },
                }}
              >
                상품 비교하기 ({selectedIds.length}개)
              </Button>
            </Box>
          )}
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* 플랫폼 탭 */}
        <Card sx={{ borderRadius: 3, mb: 3, border: `1px solid ${alpha(brandColor, 0.2)}` }}>
          <CardContent sx={{ p: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  minHeight: 48,
                  borderRadius: 2,
                  mx: 0.5,
                  "&.Mui-selected": {
                    backgroundColor: alpha(brandColor, 0.1),
                    color: brandColor,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: brandColor,
                  height: 3,
                  borderRadius: 1.5,
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.label}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{tab.emoji}</span>
                      <span>{tab.label}</span>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* 필터 섹션 */}
        {showFilters && (
          <Card sx={{ borderRadius: 3, mb: 3, border: `1px solid ${alpha(brandColor, 0.2)}` }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: brandColor }}>
                🎛️ 세부 필터
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>검색 대상 플랫폼</InputLabel>
                    <Select
                      multiple
                      value={selectedSources}
                      label="검색 대상 플랫폼"
                      onChange={handleSourceChange}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="danggeun">🥕 당근마켓</MenuItem>
                      <MenuItem value="bunjang">⚡ 번개장터</MenuItem>
                      <MenuItem value="junggonara">💼 중고나라</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>정렬 기준</InputLabel>
                    <Select 
                      value={sortBy} 
                      label="정렬 기준" 
                      onChange={handleSortChange}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="price_asc">💰 가격 낮은 순</MenuItem>
                      <MenuItem value="price_desc">💎 가격 높은 순</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography gutterBottom fontWeight="600">
                    💵 가격 범위
                  </Typography>
                  <Slider
                    value={priceRange}
                    onChange={handlePriceChange}
                    min={0}
                    max={1000000}
                    step={10000}
                    valueLabelDisplay="auto"
                    valueLabelFormat={formatPrice}
                    sx={{
                      color: brandColor,
                      "& .MuiSlider-thumb": {
                        backgroundColor: brandColor,
                      },
                      "& .MuiSlider-track": {
                        backgroundColor: brandColor,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="🔍 키워드 필터"
                    placeholder="+포함할키워드, -제외할키워드 (쉼표로 구분)"
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    helperText="+ 기호로 포함할 키워드, - 기호로 제외할 키워드를 지정하세요"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 검색 결과 */}
        {loading ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress sx={{ color: brandColor }} size={60} />
            <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
              검색 중입니다...
            </Typography>
          </Box>
        ) : error ? (
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 3,
              "& .MuiAlert-icon": { color: "#d32f2f" }
            }}
          >
            {error}
          </Alert>
        ) : (
          <>
            {/* 검색 결과 헤더 */}
            {sorted.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6" fontWeight="600">
                  📦 검색 결과 ({sorted.length}개)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedLocation}에서 검색한 결과입니다
                </Typography>
              </Box>
            )}

            {/* 상품 그리드 */}
            <Grid container spacing={3}>
              {sorted.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product._id || product.productUrl}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha('#000', 0.1)}`,
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                        borderColor: alpha(brandColor, 0.3),
                      },
                      ...(selectedIds.includes(product._id || product.productUrl) && {
                        borderColor: brandColor,
                        backgroundColor: alpha(brandColor, 0.02),
                      }),
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={product.imageUrl || "/api/placeholder/300/200"}
                      alt={product.title}
                      sx={{ borderRadius: "12px 12px 0 0" }}
                    />
                    <CardContent sx={{ p: 2 }}>
                      <Chip
                        label={getSourceName(product.source)}
                        size="small"
                        sx={{
                          backgroundColor: getSourceColor(product.source),
                          color: "#fff",
                          mb: 1,
                          fontSize: "0.75rem",
                        }}
                      />
                      <Typography 
                        variant="body1" 
                        fontWeight="600" 
                        sx={{ 
                          mb: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {product.title}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        color={brandColor}
                      >
                        {product.price != null ? formatPrice(product.price) : product.priceText}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button 
                        size="small" 
                        onClick={() => window.open(product.productUrl)}
                        sx={{ color: brandColor }}
                      >
                        보기
                      </Button>
                      <Button
                        size="small"
                        onClick={() => toggleSelect(product._id || product.productUrl)}
                        variant={selectedIds.includes(product._id || product.productUrl) ? "contained" : "outlined"}
                        sx={{
                          ...(selectedIds.includes(product._id || product.productUrl) 
                            ? { backgroundColor: brandColor, "&:hover": { backgroundColor: "#3A7BC8" } }
                            : { borderColor: brandColor, color: brandColor }
                          ),
                        }}
                      >
                        {selectedIds.includes(product._id || product.productUrl) ? "선택됨" : "선택"}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => navigate(`/product/${product._id}`)}
                        sx={{ color: brandColor }}
                      >
                        상세
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* 검색 결과 없음 */}
            {sorted.length === 0 && !loading && (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h4" sx={{ mb: 2 }}>
                  🔍
                </Typography>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                  검색 결과가 없습니다
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  다른 키워드로 검색해보거나 필터를 조정해보세요
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default SearchPage;