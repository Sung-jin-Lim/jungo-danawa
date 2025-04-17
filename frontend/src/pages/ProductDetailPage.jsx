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

  // State
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock function to fetch product details
  const fetchProductDetails = async (productId) => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, this would be an API call to the backend
      // const response = await fetch(`/api/products/${productId}`);
      // const data = await response.json();

      // For now, simulate a response with mock data
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

      // Mock product data
      const mockProduct = {
        id: productId,
        title: "iPhone 13 Pro 128GB",
        price: 750000,
        priceText: "750,000원",
        description:
          "아이폰 13 프로 128GB 그래파이트 색상입니다. 구매한지 1년 정도 되었고, 케이스 착용해서 사용해서 기스 없이 깨끗합니다. 배터리 성능 91% 남아있습니다.",
        source: "danggeun",
        location: "서울 강남구",
        condition: "상태 좋음",
        sellerName: "당근이",
        images: [
          "https://via.placeholder.com/600x400?text=iPhone+13+Pro+1",
          "https://via.placeholder.com/600x400?text=iPhone+13+Pro+2",
          "https://via.placeholder.com/600x400?text=iPhone+13+Pro+3",
        ],
        specs: {
          모델명: "iPhone 13 Pro",
          용량: "128GB",
          색상: "그래파이트",
          구매시기: "2022년 1월",
          "배터리 성능": "91%",
        },
        timestamp: new Date().toISOString(),
      };

      setProduct(mockProduct);

      // Mock similar products
      const mockSimilarProducts = [
        {
          id: "2",
          title: "iPhone 13 Pro 256GB",
          price: 820000,
          priceText: "820,000원",
          source: "bunjang",
          imageUrl: "https://via.placeholder.com/150?text=iPhone+13+Pro+256",
          location: "서울 서초구",
        },
        {
          id: "3",
          title: "iPhone 13 128GB",
          price: 650000,
          priceText: "650,000원",
          source: "danggeun",
          imageUrl: "https://via.placeholder.com/150?text=iPhone+13",
          location: "서울 마포구",
        },
        {
          id: "4",
          title: "iPhone 13 Pro Max 128GB",
          price: 900000,
          priceText: "900,000원",
          source: "bunjang",
          imageUrl: "https://via.placeholder.com/150?text=iPhone+13+Pro+Max",
          location: "서울 송파구",
        },
      ];

      setSimilarProducts(mockSimilarProducts);

      // Mock market analysis
      const mockMarketAnalysis = {
        marketPrice: 1200000,
        disparity: 450000,
        disparityPercentage: 37.5,
        marketProducts: [
          {
            id: "5",
            title: "Apple 아이폰 13 Pro 128GB",
            price: 1190000,
            priceText: "1,190,000원",
            source: "coupang",
            imageUrl: "https://via.placeholder.com/150?text=Coupang+iPhone+13+Pro",
          },
          {
            id: "6",
            title: "Apple 정품 iPhone 13 Pro 128GB",
            price: 1210000,
            priceText: "1,210,000원",
            source: "coupang",
            imageUrl: "https://via.placeholder.com/150?text=Coupang+iPhone+13+Pro+2",
          },
        ],
      };

      setMarketAnalysis(mockMarketAnalysis);
    } catch (err) {
      console.error("Error fetching product details:", err);
      setError("Failed to load product details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch product details when component mounts
  useEffect(() => {
    if (id) {
      fetchProductDetails(id);
    }
  }, [id]);

  // Format price as Korean Won
  const formatPrice = (price) => {
    return (
      new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })
        .format(price)
        .replace("₩", "") + "원"
    );
  };

  // Get source display name
  const getSourceName = (source) => {
    switch (source) {
      case "danggeun":
        return "당근마켓";
      case "bunjang":
        return "번개장터";
      case "coupang":
        return "쿠팡";
      default:
        return source;
    }
  };

  // Get source color
  const getSourceColor = (source) => {
    switch (source) {
      case "danggeun":
        return "#ff8a3d";
      case "bunjang":
        return "#ff5058";
      case "coupang":
        return "#346aff";
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
        {/* Product Images */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia component="img" height="400" image={product.images[0]} alt={product.title} />
            <Box sx={{ display: "flex", p: 1, overflowX: "auto" }}>
              {product.images.map((image, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 80,
                    height: 80,
                    flexShrink: 0,
                    mr: 1,
                    border: "2px solid",
                    borderColor: index === 0 ? "primary.main" : "transparent",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>

        {/* Product Info */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Chip
                  label={getSourceName(product.source)}
                  sx={{ bgcolor: getSourceColor(product.source), color: "white" }}
                />
                <Typography variant="body2" color="text.secondary">
                  {new Date(product.timestamp).toLocaleDateString()}
                </Typography>
              </Box>

              <Typography variant="h4" component="h1" gutterBottom>
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
                  onClick={() => window.open("#", "_blank")}
                  sx={{ mb: 2 }}
                >
                  원본 페이지에서 보기
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<CompareArrowsIcon />}
                  onClick={() => navigate("/compare?ids=" + id)}
                >
                  다른 제품과 비교하기
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Product Specifications */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              제품 사양
            </Typography>
            <TableContainer>
              <Table>
                <TableBody>
                  {Object.entries(product.specs).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ width: "30%", fontWeight: "bold" }}
                      >
                        {key}
                      </TableCell>
                      <TableCell>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Market Price Comparison */}
      {marketAnalysis &&
        marketAnalysis.marketProducts &&
        marketAnalysis.marketProducts.length > 0 && (
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
                    {marketAnalysis.marketProducts.map((marketProduct) => {
                      const priceDiff = marketProduct.price - product.price;
                      const priceDiffPercentage = (priceDiff / marketProduct.price) * 100;

                      return (
                        <TableRow key={marketProduct.id}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Chip
                                label={getSourceName(marketProduct.source)}
                                size="small"
                                sx={{
                                  mr: 1,
                                  bgcolor: getSourceColor(marketProduct.source),
                                  color: "white",
                                }}
                              />
                              {marketProduct.title}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{marketProduct.priceText}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: theme.palette.success.main, fontWeight: "bold" }}
                          >
                            {formatPrice(priceDiff)} ({priceDiffPercentage.toFixed(1)}%)
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
      {similarProducts && similarProducts.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            유사한 제품
          </Typography>
          <Grid container spacing={3}>
            {similarProducts.map((similarProduct) => (
              <Grid item xs={12} sm={6} md={4} key={similarProduct.id}>
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
                  onClick={() => navigate(`/product/${similarProduct.id}`)}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={similarProduct.imageUrl}
                    alt={similarProduct.title}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Chip
                        label={getSourceName(similarProduct.source)}
                        size="small"
                        sx={{ bgcolor: getSourceColor(similarProduct.source), color: "white" }}
                      />
                      {similarProduct.location && (
                        <Typography variant="body2" color="text.secondary">
                          {similarProduct.location}
                        </Typography>
                      )}
                    </Box>
                    <Typography gutterBottom variant="subtitle1" component="h2">
                      {similarProduct.title}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {similarProduct.priceText}
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
