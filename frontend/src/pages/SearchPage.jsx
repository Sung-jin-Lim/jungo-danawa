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
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  // URL params
  const queryParams = new URLSearchParams(location.search);
  const queryFromUrl = queryParams.get("q") || "";

  // State
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
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

  const tabs = [
    { label: "All", value: null },
    { label: "Danggeun", value: "danggeun" },
    { label: "Coupang", value: "coupang" },
    { label: "Bunjang", value: "bunjang" },
    { label: "Junggonara", value: "junggonara" },
  ];

  // Format price
  const formatPrice = (value) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })
      .format(value)
      .replace("₩", "") + "원";

  // Source labels + colors
  const getSourceName = (src) =>
    ({ danggeun: "당근마켓", coupang: "쿠팡", bunjang: "번개장터", junggonara: "중고나라" }[src] ||
    src);
  const getSourceColor = (src) =>
    ({
      danggeun: theme.palette.warning.main,
      coupang: theme.palette.primary.main,
      bunjang: theme.palette.error.main,
      junggonara: theme.palette.success.main,
    }[src] || theme.palette.primary.main);

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
      setError("Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
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
    <Container sx={{ py: 4 }}>
      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box component="form" onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8} md={6}>
              <TextField
                fullWidth
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={4} md={2}>
              <Button variant="contained" fullWidth onClick={doSearch}>
                Search
              </Button>
            </Grid>
            {selectedIds.length >= 2 && (
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={<CompareArrowsIcon />}
                  onClick={goCompare}
                >
                  Compare ({selectedIds.length})
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>

      {/* Filters & Tabs */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
        <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Sources</InputLabel>
              <Select
                multiple
                value={selectedSources}
                label="Sources"
                onChange={handleSourceChange}
              >
                <MenuItem value="danggeun">당근마켓</MenuItem>
                <MenuItem value="coupang">쿠팡</MenuItem>
                <MenuItem value="bunjang">번개장터</MenuItem>
                <MenuItem value="junggonara">중고나라</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Sort by</InputLabel>
              <Select value={sortBy} label="Sort by" onChange={handleSortChange}>
                <MenuItem value="price_asc">Price: Low → High</MenuItem>
                <MenuItem value="price_desc">Price: High → Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>Price Range</Typography>
            <Slider
              value={priceRange}
              onChange={handlePriceChange}
              min={0}
              max={1000000}
              step={10000}
              valueLabelDisplay="auto"
              valueLabelFormat={formatPrice}
            />
          </Grid>

          {/* Keyword Include/Exclude */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Keyword Filters"
              placeholder="+include, -exclude (comma separated)"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              helperText="Prefix with + to include, - to exclude"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {loading ? (
        <Box textAlign="center">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          {sorted.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p._id || p.productUrl}>
              <Card>
                <CardMedia component="img" height="200" image={p.imageUrl} alt={p.title} />
                <CardContent>
                  <Chip
                    label={getSourceName(p.source)}
                    size="small"
                    sx={{
                      backgroundColor: getSourceColor(p.source),
                      color: "#fff",
                      mb: 1,
                    }}
                  />
                  <Typography variant="h6" gutterBottom>
                    {p.title}
                  </Typography>
                  <Typography color="primary">
                    {p.price != null ? formatPrice(p.price) : p.priceText}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => window.open(p.productUrl)}>
                    View
                  </Button>
                  <Button size="small" onClick={() => toggleSelect(p._id || p.productUrl)}>
                    {selectedIds.includes(p._id || p.productUrl) ? "Deselect" : "Select"}
                  </Button>
                  <Button size="small" onClick={() => navigate(`/product/${p._id}`)}>
                    Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default SearchPage;
