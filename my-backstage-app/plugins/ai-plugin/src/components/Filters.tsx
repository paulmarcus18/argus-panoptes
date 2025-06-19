import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from '@mui/material';

interface FiltersProps {
  allSystems: string[];
  selectedSystem: string;
  onSystemChange: (value: string) => void;
  repoSearch: string;
  onRepoSearchChange: (value: string) => void;
}

export const Filters = ({
  allSystems,
  selectedSystem,
  onSystemChange,
  repoSearch,
  onRepoSearchChange,
}: FiltersProps) => {
  const handleSystemChange = (event: SelectChangeEvent) => {
    onSystemChange(event.target.value);
  };

  const handleRepoSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onRepoSearchChange(event.target.value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, marginBottom: 4 }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="system-filter-label">System</InputLabel>
        <Select
          labelId="system-filter-label"
          value={selectedSystem}
          label="System"
          onChange={handleSystemChange}
        >
          {allSystems.map(system => (
            <MenuItem key={system} value={system}>
              {system}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Search Repo"
        variant="outlined"
        value={repoSearch}
        onChange={handleRepoSearchChange}
      />
    </Box>
  );
};
