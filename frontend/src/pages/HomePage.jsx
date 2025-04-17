import React from "react";
import { useNavigate } from "react-router-dom";
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
  InputAdornment,
  IconButton,
  Paper,
  Divider,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import DevicesIcon from "@mui/icons-material/Devices";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const features = [
    {
      icon: <SearchIcon fontSize="large" color="primary" />,
      title: "Multi-Platform Search",
      description:
        "Search across Danggeun, Bunjang, and Coupang simultaneously to find the best deals.",
    },
    {
      icon: <CompareArrowsIcon fontSize="large" color="primary" />,
      title: "Price Comparison",
      description: "Compare second-hand prices with market prices to see how much you can save.",
    },
    {
      icon: <DevicesIcon fontSize="large" color="primary" />,
      title: "Tech Product Analysis",
      description:
        "AI-powered analysis of tech products to help you find the best value for your money.",
    },
    {
      icon: <LocalOfferIcon fontSize="large" color="primary" />,
      title: "Deal Rating",
      description:
        "See which deals offer the best value based on condition, price, and market rates.",
    },
  ];

  const popularCategories = [
    { name: "Smartphones", image: "https://via.placeholder.com/150?text=Smartphones" },
    { name: "Laptops", image: "https://via.placeholder.com/150?text=Laptops" },
    { name: "Tablets", image: "https://via.placeholder.com/150?text=Tablets" },
    { name: "Cameras", image: "https://via.placeholder.com/150?text=Cameras" },
    { name: "Gaming", image: "https://via.placeholder.com/150?text=Gaming" },
    { name: "Audio", image: "https://via.placeholder.com/150?text=Audio" },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        sx={{
          position: "relative",
          backgroundColor: "grey.800",
          color: "#fff",
          mb: 4,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundImage: "url(https://source.unsplash.com/random?shopping)",
          minHeight: "500px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Overlay for darkening background */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,.5)",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative", py: 8 }}>
          <Typography
            component="h1"
            variant="h2"
            color="inherit"
            gutterBottom
            sx={{ fontWeight: "bold", textAlign: "center" }}
          >
            Find the Best Deals Across Platforms
          </Typography>
          <Typography variant="h5" color="inherit" paragraph sx={{ textAlign: "center", mb: 4 }}>
            Compare prices from Danggeun, Bunjang, and Coupang to get the best value for your money.
          </Typography>

          {/* Search Bar */}
          <Box component="form" onSubmit={handleSearch} sx={{ textAlign: "center" }}>
            <TextField
              fullWidth
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              sx={{
                maxWidth: "600px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: 1,
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ mb: 4 }}>
          Why Use Jungo-Danawa?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography gutterBottom variant="h5" component="h3">
                    {feature.title}
                  </Typography>
                  <Typography>{feature.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Divider sx={{ mb: 8 }} />

      {/* Popular Categories */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ mb: 4 }}>
          Popular Categories
        </Typography>
        <Grid container spacing={3}>
          {popularCategories.map((category, index) => (
            <Grid item xs={6} sm={4} md={2} key={index}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/search?category=${encodeURIComponent(category.name)}`)}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={category.image}
                  alt={category.name}
                />
                <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                  <Typography gutterBottom variant="h6" component="h3">
                    {category.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box
        sx={{
          bgcolor: theme.palette.primary.main,
          color: "white",
          py: 6,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" gutterBottom>
            Ready to Find Amazing Deals?
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Start searching now and discover the best prices across multiple platforms.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate("/search")}
          >
            Get Started
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
