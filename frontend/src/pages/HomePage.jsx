import React, { useState } from "react";
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
  InputAdornment,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from "@mui/icons-material";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("용답동");
  const [locationAnchor, setLocationAnchor] = useState(null);
  const navigate = useNavigate();

  const brandColor = '#4A90E2'; // 파란색 계열로 변경

  const seoulDistricts = [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
    "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
    "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"
  ];

  const seoulDongs = {
    "성동구": ["용답동", "성수동", "왕십리동", "금호동", "옥수동", "행당동", "응봉동"],
    "강남구": ["역삼동", "개포동", "청담동", "삼성동", "대치동", "논현동", "압구정동"],
    "서초구": ["서초동", "잠원동", "반포동", "방배동", "양재동", "내곡동"],
    // 더 많은 동 데이터를 추가할 수 있음
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&location=${selectedLocation}`);
    }
  };

  const handleLocationClick = (event) => {
    setLocationAnchor(event.currentTarget);
  };

  const handleLocationClose = () => {
    setLocationAnchor(null);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setLocationAnchor(null);
  };

  const priceData = [
    { name: "당근마켓", price: "920,000", isLowest: true },
    { name: "번개장터", price: "950,000", isLowest: false },
    { name: "중고나라", price: "980,000", isLowest: false },
  ];

  return (
    <Box sx={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}>
      <Container maxWidth="md" sx={{ pt: 4, pb: 6 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h6" color={brandColor} fontWeight="bold" sx={{ mb: 3 }}>
            🔍 더나와
          </Typography>
        </Box>

        {/* 메인 타이틀 */}
        <Typography 
          variant="h3" 
          fontWeight="bold" 
          textAlign="center"
          sx={{ 
            mb: 2,
            fontSize: { xs: "1.8rem", md: "2.2rem" }
          }}
        >
          여러 사이트 가격을 한번에 비교하고
          <Box component="span" sx={{ color: brandColor }}>
            {" "}최저가{" "}
          </Box>
          찾아보세요
        </Typography>

        <Typography 
          variant="body1" 
          color="text.secondary" 
          textAlign="center" 
          sx={{ mb: 4 }}
        >
          당근마켓 · 번개장터 · 중고나라 실시간 비교
        </Typography>

        {/* 지역 선택 + 검색 바 */}
        <Box sx={{ mb: 4 }}>
          {/* 지역 선택 버튼 */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Button
              onClick={handleLocationClick}
              endIcon={<KeyboardArrowDownIcon />}
              sx={{
                backgroundColor: alpha(brandColor, 0.1),
                color: brandColor,
                borderRadius: 2,
                px: 3,
                py: 1,
                "&:hover": {
                  backgroundColor: alpha(brandColor, 0.2),
                },
              }}
            >
              <LocationOnIcon sx={{ mr: 1, fontSize: 20 }} />
              {selectedLocation}
            </Button>
          </Box>

          {/* 지역 선택 메뉴 */}
          <Menu
            anchorEl={locationAnchor}
            open={Boolean(locationAnchor)}
            onClose={handleLocationClose}
            PaperProps={{
              style: {
                maxHeight: 300,
                width: 200,
              },
            }}
          >
            <MenuItem disabled sx={{ fontWeight: "bold", color: brandColor }}>
              서울시 성동구
            </MenuItem>
            {(seoulDongs["성동구"] || []).map((dong) => (
              <MenuItem
                key={dong}
                onClick={() => handleLocationSelect(dong)}
                selected={selectedLocation === dong}
              >
                {dong}
              </MenuItem>
            ))}
            <MenuItem disabled sx={{ fontWeight: "bold", color: brandColor, mt: 1 }}>
              서울시 강남구
            </MenuItem>
            {(seoulDongs["강남구"] || []).map((dong) => (
              <MenuItem
                key={dong}
                onClick={() => handleLocationSelect(dong)}
                selected={selectedLocation === dong}
              >
                {dong}
              </MenuItem>
            ))}
            <MenuItem disabled sx={{ fontWeight: "bold", color: brandColor, mt: 1 }}>
              서울시 서초구
            </MenuItem>
            {(seoulDongs["서초구"] || []).map((dong) => (
              <MenuItem
                key={dong}
                onClick={() => handleLocationSelect(dong)}
                selected={selectedLocation === dong}
              >
                {dong}
              </MenuItem>
            ))}
          </Menu>

          {/* 검색 바 */}
          <Box component="form" onSubmit={handleSearch}>
            <TextField
              fullWidth
              placeholder="상품명을 입력해주세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "white",
                  borderRadius: 3,
                  fontSize: "1.1rem",
                  py: 0.5,
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
          </Box>
        </Box>

        {/* 가격 비교 예시 */}
        <Card sx={{ borderRadius: 3, mb: 4, border: `1px solid ${alpha(brandColor, 0.2)}` }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
              💡 아이폰 14 Pro 실시간 가격
            </Typography>
            
            <Grid container spacing={2}>
              {priceData.map((item, index) => (
                <Grid item xs={4} key={index}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: item.isLowest ? alpha(brandColor, 0.1) : "#F8F9FA",
                      border: item.isLowest ? `2px solid ${brandColor}` : "none",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.name}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color={item.isLowest ? brandColor : "text.primary"}>
                      {item.price}원
                    </Typography>
                    {item.isLowest && (
                      <Chip
                        label="최저가"
                        size="small"
                        sx={{
                          backgroundColor: brandColor,
                          color: "white",
                          fontSize: "0.7rem",
                          height: 20,
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* 핵심 기능 */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                🔍 실시간 비교
              </Typography>
              <Typography variant="body2" color="text.secondary">
                3개 플랫폼 가격을 한눈에
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                📱 최저가 알림
              </Typography>
              <Typography variant="body2" color="text.secondary">
                원하는 가격이 되면 알림
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                ✅ 안전 거래
              </Typography>
              <Typography variant="body2" color="text.secondary">
                신뢰도 높은 판매자만
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* 간단한 설명 */}
        <Box sx={{ textAlign: "center", py: 3 }}>
          <Typography variant="body1" color="text.secondary">
            검색창에 원하는 상품을 입력하고 엔터를 누르세요
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;