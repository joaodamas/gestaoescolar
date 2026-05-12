export const MODULOS_POR_PERFIL = {
  diretor: [
    'dashboard', 'turmas', 'alunos', 'chamada', 'calendario', 'notas',
    'disciplinas', 'financeiro', 'ocorrencias', 'projetos', 'relatorios',
    'usuarios', 'auditoria', 'configuracoes', 'secretaria',
  ],
  coordenador: [
    'dashboard', 'turmas', 'alunos', 'chamada', 'calendario', 'notas',
    'disciplinas', 'ocorrencias', 'projetos', 'relatorios', 'secretaria',
  ],
  professor: ['dashboard', 'turmas', 'chamada', 'notas', 'disciplinas', 'relatorios'],
  admin: [
    'dashboard', 'calendario', 'financeiro', 'projetos', 'usuarios',
    'auditoria', 'configuracoes', 'relatorios', 'secretaria',
  ],
  secretaria: ['dashboard', 'relatorios', 'secretaria'],
}

export function perfilPodeAcessarModulo(perfil, modulo) {
  if (!modulo) return true
  return MODULOS_POR_PERFIL[perfil]?.includes(modulo) ?? false
}
