export const MODULOS_POR_PERFIL = {
  diretor: [
    'dashboard', 'turmas', 'alunos', 'chamada', 'calendario', 'notas',
    'disciplinas', 'financeiro', 'ocorrencias', 'projetos', 'relatorios',
    'usuarios', 'auditoria', 'configuracoes', 'secretaria', 'diario', 'saude',
    'nutricao', 'colegio', 'paesp', 'integracoes', 'supervisao',
  ],
  coordenador: [
    'dashboard', 'turmas', 'alunos', 'chamada', 'calendario', 'notas',
    'disciplinas', 'ocorrencias', 'projetos', 'relatorios', 'secretaria',
    'diario', 'colegio', 'supervisao',
  ],
  professor: ['dashboard', 'turmas', 'chamada', 'notas', 'disciplinas', 'relatorios', 'diario'],
  admin: [
    'dashboard', 'calendario', 'financeiro', 'projetos', 'usuarios',
    'auditoria', 'configuracoes', 'relatorios', 'secretaria', 'colegio', 'integracoes',
  ],
  secretaria: ['dashboard', 'relatorios', 'secretaria', 'colegio'],
  supervisor: ['dashboard', 'relatorios', 'supervisao', 'diario', 'colegio'],
  saude: ['dashboard', 'saude', 'relatorios', 'colegio'],
  nutricao: ['dashboard', 'nutricao', 'relatorios', 'colegio'],
  transporte: ['dashboard', 'colegio', 'relatorios'],
}

export function perfilPodeAcessarModulo(perfil, modulo) {
  if (!modulo) return true
  return MODULOS_POR_PERFIL[perfil]?.includes(modulo) ?? false
}
