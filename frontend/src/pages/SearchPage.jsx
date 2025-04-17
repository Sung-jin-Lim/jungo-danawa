// File: frontend/src/pages/SearchPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchProducts } from "../services/api"; // unchanged import
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
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Pull initial query from URL
  const queryParams = new URLSearchParams(location.search);
  const queryFromUrl = queryParams.get("q") || "";

  // UI state
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1_000_000]);
  const [selectedSources, setSelectedSources] = useState(["danggeun", "coupang"]);
  const [sortBy, setSortBy] = useState("price_asc");
  const [selectedIds, setSelectedIds] = useState([]);

  // You said you only wanted 3 results:
  const RESULT_LIMIT = 3;

  // Format KRW
  const formatPrice = (price) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })
      .format(price)
      .replace("₩", "") + "원";

  // Core search function
  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // call API with (query, limit, sources)
      const { products: items } = await searchProducts(searchQuery, RESULT_LIMIT, selectedSources);

      // now filter by priceRange on the client
      const visible = items.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

      setProducts(visible);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  };

  // when user submits form
  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    doSearch();
  };

  // comparison select
  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const goCompare = () => navigate(`/compare?ids=${selectedIds.join(",")}`);

  // sort results in‐place
  const sorted = [...products].sort((a, b) =>
    sortBy === "price_asc" ? a.price - b.price : b.price - a.price
  );

  // run initial search if URL had a query
  useEffect(() => {
    if (queryFromUrl) doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* ...you can re‑insert your Tabs, Filters, etc. here... */}

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
            <Grid item xs={12} sm={6} md={4} key={p.productUrl}>
              <Card>
                <CardMedia component="img" height="200" image={p.imageUrl} alt={p.title} />
                <CardContent>
                  <Typography variant="h6">{p.title}</Typography>
                  <Typography color="primary">{p.priceText}</Typography>
                  <Typography variant="body2">{p.location}</Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => window.open(p.productUrl)}>
                    View
                  </Button>
                  <Button size="small" onClick={() => toggleSelect(p.productUrl)}>
                    {selectedIds.includes(p.productUrl) ? "Deselect" : "Select"}
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
