'use client';
import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import { PROFISSOES_OPC } from "./constants";

export default function ProfissaoEditor({
    values,
    onChange,
}: {
    values: string[];
    onChange: (v: string[]) => void;
}) {
    const [adding, setAdding] = useState(false);

    function add(v: string) {
        if (v && !values.includes(v)) onChange([...values, v]);
        setAdding(false);
    }
    function remove(v: string) {
        onChange(values.filter((x) => x !== v));
    }

    const disponiveis = PROFISSOES_OPC.filter((p) => !values.includes(p));

    return (
        <Box>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                {values.map((v) => (
                    <Chip key={v} label={v} size="small" onDelete={() => remove(v)} />
                ))}
                {adding ? (
                    <TextField
                        select
                        size="small"
                        value=""
                        onChange={(e) => add(e.target.value)}
                        onBlur={() => setAdding(false)}
                        autoFocus
                        sx={{ minWidth: 160 }}
                        slotProps={{ select: { open: true, displayEmpty: true } }}
                    >
                        <MenuItem value="" disabled>Selecionar…</MenuItem>
                        {disponiveis.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </TextField>
                ) : (
                    <IconButton size="small" onClick={() => setAdding(true)} title="Adicionar profissão">
                        <AddIcon fontSize="small" />
                    </IconButton>
                )}
            </Stack>
        </Box>
    );
}
