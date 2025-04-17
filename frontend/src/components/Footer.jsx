import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Container, Grid, Typography, Link, Divider, useTheme } from "@mui/material";

const Footer = () => {
  const theme = useTheme();
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: "auto",
        backgroundColor: theme.palette.mode === "light" ? "grey.200" : "grey.800",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Jungo-Danawa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find the best deals across multiple second-hand platforms and compare with market
              prices.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Quick Links
            </Typography>
            <Link component={RouterLink} to="/" color="inherit" display="block" sx={{ mb: 1 }}>
              Home
            </Link>
            <Link
              component={RouterLink}
              to="/search"
              color="inherit"
              display="block"
              sx={{ mb: 1 }}
            >
              Search
            </Link>
            <Link
              component={RouterLink}
              to="/compare"
              color="inherit"
              display="block"
              sx={{ mb: 1 }}
            >
              Compare
            </Link>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Supported Platforms
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Danggeun Market
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Bunjang
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Coupang
            </Typography>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          © {year} Jungo-Danawa. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
