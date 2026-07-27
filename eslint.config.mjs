import next from 'eslint-config-next';

const eslintConfig = [{ ignores: ['db-data/**', 'valkey-data/**'] }, ...next];

export default eslintConfig;
