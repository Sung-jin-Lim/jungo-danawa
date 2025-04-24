// File: frontend/src/pages/ProductDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProductDetails = async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error("Not found");
      const { product, similarProducts, marketAnalysis } = await response.json();
      setProduct(product);
      setSimilarProducts(similarProducts);
      setMarketAnalysis(marketAnalysis);
    } catch (err) {
      console.error(err);
      setError("Failed to load product details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProductDetails(id);
    }
  }, [id]);

  const formatPrice = (price) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    })
      .format(price)
      .replace("₩", "") + "원";

  const getSourceName = (src) => {
    switch (src) {
      case "danggeun":
        return "당근마켓";
      case "bunjang":
        return "번개장터";
      case "coupang":
        return "쿠팡";
      default:
        return src;
    }
  };

  const getSourceColor = (src) => {
    switch (src) {
      case "danggeun":
        return theme.palette.warning.main;
      case "bunjang":
        return theme.palette.error.main;
      case "coupang":
        return theme.palette.primary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading product details...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button variant="contained" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Box>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="warning">Product not found</Alert>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button variant="contained" onClick={() => navigate("/search")}>
            Back to Search
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Product Details */}
      <Grid container spacing={4}>
        {/* Images */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia component="img" height="400" image={product.images[0]} alt={product.title} />
            <Box sx={{ display: "flex", p: 1, overflowX: "auto" }}>
              {product.images.map((img, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 80,
                    height: 80,
                    flexShrink: 0,
                    mr: 1,
                    border: 2,
                    borderColor: i === 0 ? "primary.main" : "transparent",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={img}
                    alt={`${product.title} ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>

        {/* Info */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Chip
                  label={getSourceName(product.source)}
                  sx={{ bgcolor: getSourceColor(product.source), color: "#fff" }}
                />
                <Typography variant="body2" color="text.secondary">
                  {new Date(product.timestamp).toLocaleDateString()}
                </Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {product.title}
              </Typography>
              <Typography variant="h3" color="primary" sx={{ fontWeight: "bold", my: 2 }}>
                {product.priceText}
              </Typography>

              {marketAnalysis && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: theme.palette.success.light,
                    color: theme.palette.success.contrastText,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ display: "flex", alignItems: "center" }}>
                    <CompareArrowsIcon sx={{ mr: 1 }} />
                    시장가 대비 {marketAnalysis.disparityPercentage.toFixed(1)}% 저렴
                  </Typography>
                  <Typography variant="body2">
                    시장가: {formatPrice(marketAnalysis.marketPrice)} | 절약:{" "}
                    {formatPrice(marketAnalysis.disparity)}
                  </Typography>
                </Paper>
              )}

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {product.location && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                      <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
                      {product.location}
                    </Typography>
                  </Grid>
                )}
                {product.sellerName && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                      판매자: {product.sellerName}
                    </Typography>
                  </Grid>
                )}
                {product.condition && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                      <LocalOfferIcon fontSize="small" sx={{ mr: 1 }} />
                      상태: {product.condition}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                제품 설명
              </Typography>
              <Typography variant="body1" paragraph>
                {product.description}
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => window.open(product.productUrl, "_blank")}
                  sx={{ mb: 2 }}
                >
                  원본 페이지에서 보기
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<CompareArrowsIcon />}
                  onClick={() => navigate(`/compare?ids=${source}-${id}`)}
                >
                  다른 제품과 비교하기
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Specs */}
      {product.specs && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              제품 사양
            </Typography>
            <TableContainer>
              <Table>
                <TableBody>
                  {Object.entries(product.specs).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ width: "30%", fontWeight: "bold" }}
                      >
                        {k}
                      </TableCell>
                      <TableCell>{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Market Comparison */}
      {marketAnalysis?.marketProducts?.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
              <CompareArrowsIcon sx={{ mr: 1 }} />
              시장가 비교
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              쿠팡에서 판매 중인 동일/유사 제품과의 가격 비교
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>제품명</TableCell>
                    <TableCell align="right">가격</TableCell>
                    <TableCell align="right">차이</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {marketAnalysis.marketProducts.map((m) => {
                    const diff = m.price - product.price;
                    const pct = (diff / m.price) * 100;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Chip
                              label={getSourceName(m.source)}
                              size="small"
                              sx={{
                                mr: 1,
                                bgcolor: getSourceColor(m.source),
                                color: "#fff",
                              }}
                            />
                            {m.title}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{m.priceText}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: theme.palette.success.main,
                            fontWeight: "bold",
                          }}
                        >
                          {formatPrice(diff)} ({pct.toFixed(1)}%)
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            유사한 제품
          </Typography>
          <Grid container spacing={3}>
            {similarProducts.map((sp) => (
              <Grid item xs={12} sm={6} md={4} key={sp.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: 6,
                    },
                  }}
                  onClick={() => navigate(`/product/${sp.id}`)}
                >
                  <CardMedia component="img" height="140" image={sp.imageUrl} alt={sp.title} />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Chip
                        label={getSourceName(sp.source)}
                        size="small"
                        sx={{
                          bgcolor: getSourceColor(sp.source),
                          color: "#fff",
                        }}
                      />
                      {sp.location && (
                        <Typography variant="body2" color="text.secondary">
                          {sp.location}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="subtitle1" gutterBottom>
                      {sp.title}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {sp.priceText}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default ProductDetailPage;
