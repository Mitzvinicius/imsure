'use client';

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Link from "next/link";

export default function Home() {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 3,
        bgcolor: "background.default",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 4 }}>
        <CloudOutlinedIcon sx={{ color: "secondary.main", fontSize: 32 }} />
        <Typography sx={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>
          imsure
        </Typography>
      </Stack>

      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 1.5, fontSize: { xs: 28, sm: 38 } }}>
        O funil de vendas feito para corretoras de seguros
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 480 }}>
        Gerencie prospecções, negociações e renovações em um só lugar — do primeiro contato ao fechamento.
      </Typography>

      <Button
        component={Link}
        href="/auth"
        variant="contained"
        size="large"
        endIcon={<ArrowForwardIcon />}
      >
        Entrar no Imsure
      </Button>
    </Box>
  );
}
