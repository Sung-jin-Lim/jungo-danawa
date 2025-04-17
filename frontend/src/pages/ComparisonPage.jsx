// File: frontend/src/pages/ComparisonPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getProductById, compareTechProducts } from "../services/api";
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
  CircularProgress,
  Alert,
  Paper,
  Divider,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ComparisonPage = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const params = new URLSearchParams(search);
  const productIds = (params.get("ids") || "").split(",").filter(Boolean);

  const [products, setProducts] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (productIds.length < 2) {
        setError("Select at least two products to compare.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch full product details
        const proms = productIds.map((id) => getProductById(id));
        const prods = await Promise.all(proms);
        setProducts(prods);
        // Call AI comparison
        const res = await compareTechProducts(productIds);
        setAnalysis(res.analysis);
      } catch (e) {
        setError("Failed to load comparison.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productIds]);

  if (loading)
    return (
      <Container textAlign="center">
        <CircularProgress />
      </Container>
    );
  if (error)
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );

  return (
    <Container sx={{ py: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
        Back
      </Button>
      <Typography variant="h4" gutterBottom>
        Comparison
      </Typography>

      <Grid container spacing={3}>
        {products.map((p) => (
          <Grid item xs={12} md={6} key={p._id || p.id}>
            <Card>
              <CardMedia component="img" height="200" image={p.imageUrl} alt={p.title} />
              <CardContent>
                <Typography variant="h6">{p.title}</Typography>
                <Typography>{p.priceText}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {analysis && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5">AI Analysis</Typography>
          <Divider sx={{ my: 2 }} />
          {Object.entries(analysis.comparison).map(([k, v]) => (
            <Box key={k} sx={{ mb: 1 }}>
              <Typography fontWeight="bold">{k}:</Typography>
              <Typography>{v}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 2 }} />
          {analysis.products.map((a) => (
            <Paper key={a.id} sx={{ p: 2, mb: 2 }}>
              <Typography fontWeight="bold">Rating: {a.valueRating}/10</Typography>
              <Typography>Pros: {a.pros.join(", ")}</Typography>
              <Typography>Cons: {a.cons.join(", ")}</Typography>
            </Paper>
          ))}
          <Typography fontWeight="bold">Best Value:</Typography>
          <Typography>{analysis.bestValue.reason}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography>Recommendations:</Typography>
          <Typography>{analysis.recommendations}</Typography>
        </Paper>
      )}
    </Container>
  );
};

export default ComparisonPage;
