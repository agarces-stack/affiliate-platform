// MagnetRaffic i18n - Translations
// Usage: t('key') returns translated string
// Add data-i18n="key" to HTML elements for auto-translation

const TRANSLATIONS = {
    // ============================================
    // GENERAL
    // ============================================
    'app.name': { es: 'MagnetRaffic', en: 'MagnetRaffic', pt: 'MagnetRaffic', fr: 'MagnetRaffic' },
    'app.loading': { es: 'Cargando...', en: 'Loading...', pt: 'Carregando...', fr: 'Chargement...' },
    'app.save': { es: 'Guardar', en: 'Save', pt: 'Salvar', fr: 'Enregistrer' },
    'app.cancel': { es: 'Cancelar', en: 'Cancel', pt: 'Cancelar', fr: 'Annuler' },
    'app.create': { es: 'Crear', en: 'Create', pt: 'Criar', fr: 'Créer' },
    'app.edit': { es: 'Editar', en: 'Edit', pt: 'Editar', fr: 'Modifier' },
    'app.delete': { es: 'Eliminar', en: 'Delete', pt: 'Excluir', fr: 'Supprimer' },
    'app.search': { es: 'Buscar...', en: 'Search...', pt: 'Buscar...', fr: 'Rechercher...' },
    'app.confirm': { es: '¿Estás seguro?', en: 'Are you sure?', pt: 'Tem certeza?', fr: 'Êtes-vous sûr ?' },
    'app.yes': { es: 'Sí', en: 'Yes', pt: 'Sim', fr: 'Oui' },
    'app.no': { es: 'No', en: 'No', pt: 'Não', fr: 'Non' },
    'app.actions': { es: 'Acciones', en: 'Actions', pt: 'Ações', fr: 'Actions' },
    'app.status': { es: 'Estado', en: 'Status', pt: 'Status', fr: 'Statut' },
    'app.date': { es: 'Fecha', en: 'Date', pt: 'Data', fr: 'Date' },
    'app.amount': { es: 'Monto', en: 'Amount', pt: 'Valor', fr: 'Montant' },
    'app.nodata': { es: 'Sin datos', en: 'No data', pt: 'Sem dados', fr: 'Aucune donnée' },
    'app.copied': { es: '¡Copiado!', en: 'Copied!', pt: 'Copiado!', fr: 'Copié !' },
    'app.apply': { es: 'Aplicar', en: 'Apply', pt: 'Aplicar', fr: 'Appliquer' },
    'app.filter': { es: 'Filtrar', en: 'Filter', pt: 'Filtrar', fr: 'Filtrer' },
    'app.export': { es: 'Exportar CSV', en: 'Export CSV', pt: 'Exportar CSV', fr: 'Exporter CSV' },
    'app.close': { es: 'Cerrar', en: 'Close', pt: 'Fechar', fr: 'Fermer' },

    // ============================================
    // AUTH
    // ============================================
    'auth.login': { es: 'Iniciar Sesión', en: 'Login', pt: 'Entrar', fr: 'Connexion' },
    'auth.logout': { es: 'Cerrar Sesión', en: 'Logout', pt: 'Sair', fr: 'Déconnexion' },
    'auth.register': { es: 'Registrarse', en: 'Register', pt: 'Registrar', fr: "S'inscrire" },
    'auth.email': { es: 'Email', en: 'Email', pt: 'Email', fr: 'Email' },
    'auth.password': { es: 'Contraseña', en: 'Password', pt: 'Senha', fr: 'Mot de passe' },
    'auth.firstname': { es: 'Nombre', en: 'First Name', pt: 'Nome', fr: 'Prénom' },
    'auth.lastname': { es: 'Apellido', en: 'Last Name', pt: 'Sobrenome', fr: 'Nom' },
    'auth.phone': { es: 'Teléfono', en: 'Phone', pt: 'Telefone', fr: 'Téléphone' },
    'auth.company': { es: 'Empresa', en: 'Company', pt: 'Empresa', fr: 'Entreprise' },
    'auth.website': { es: 'Sitio web', en: 'Website', pt: 'Website', fr: 'Site web' },
    'auth.login_failed': { es: 'Login fallido', en: 'Login failed', pt: 'Falha no login', fr: 'Échec de connexion' },
    'auth.registered': { es: '¡Registrado! Esperando aprobación.', en: 'Registered! Waiting for approval.', pt: 'Registrado! Aguardando aprovação.', fr: 'Inscrit ! En attente d\'approbation.' },
    'auth.admin_portal': { es: 'Portal Admin', en: 'Admin Portal', pt: 'Portal Admin', fr: 'Portail Admin' },
    'auth.affiliate_portal': { es: 'Portal de Afiliado', en: 'Affiliate Portal', pt: 'Portal do Afiliado', fr: "Portail d'Affilié" },

    // ============================================
    // SIDEBAR / NAVIGATION
    // ============================================
    'nav.overview': { es: 'Resumen', en: 'Overview', pt: 'Visão Geral', fr: 'Vue d\'ensemble' },
    'nav.affiliates': { es: 'Afiliados', en: 'Affiliates', pt: 'Afiliados', fr: 'Affiliés' },
    'nav.groups': { es: 'Grupos', en: 'Groups', pt: 'Grupos', fr: 'Groupes' },
    'nav.campaigns': { es: 'Campañas', en: 'Campaigns', pt: 'Campanhas', fr: 'Campagnes' },
    'nav.products': { es: 'Productos', en: 'Products', pt: 'Produtos', fr: 'Produits' },
    'nav.conversions': { es: 'Conversiones', en: 'Conversions', pt: 'Conversões', fr: 'Conversions' },
    'nav.renewals': { es: 'Renovaciones', en: 'Renewals', pt: 'Renovações', fr: 'Renouvellements' },
    'nav.sales_reports': { es: 'Reportes de Ventas', en: 'Sales Reports', pt: 'Relatórios de Vendas', fr: 'Rapports de Ventes' },
    'nav.coupons': { es: 'Cupones', en: 'Coupons', pt: 'Cupons', fr: 'Coupons' },
    'nav.payouts': { es: 'Pagos', en: 'Payouts', pt: 'Pagamentos', fr: 'Paiements' },
    'nav.notifications': { es: 'Notificaciones', en: 'Notifications', pt: 'Notificações', fr: 'Notifications' },
    'nav.ranks': { es: 'Rangos', en: 'Ranks', pt: 'Rankings', fr: 'Rangs' },
    'nav.fraud': { es: 'Detección de Fraude', en: 'Fraud Detection', pt: 'Detecção de Fraude', fr: 'Détection de Fraude' },
    'nav.logs': { es: 'Registros', en: 'Logs', pt: 'Registros', fr: 'Journaux' },
    'nav.settings': { es: 'Configuración', en: 'Settings', pt: 'Configurações', fr: 'Paramètres' },
    'nav.pixel': { es: 'Pixel de Tracking', en: 'Tracking Pixel', pt: 'Pixel de Rastreamento', fr: 'Pixel de Suivi' },

    // ============================================
    // DASHBOARD
    // ============================================
    'dash.title': { es: 'Panel de Control', en: 'Dashboard', pt: 'Painel', fr: 'Tableau de Bord' },
    'dash.total_affiliates': { es: 'Total Afiliados', en: 'Total Affiliates', pt: 'Total Afiliados', fr: 'Total Affiliés' },
    'dash.total_clicks': { es: 'Total Clics', en: 'Total Clicks', pt: 'Total Cliques', fr: 'Total Clics' },
    'dash.total_conversions': { es: 'Total Conversiones', en: 'Total Conversions', pt: 'Total Conversões', fr: 'Total Conversions' },
    'dash.total_revenue': { es: 'Ingresos Totales', en: 'Total Revenue', pt: 'Receita Total', fr: 'Revenu Total' },
    'dash.total_commission': { es: 'Comisión Total', en: 'Total Commission', pt: 'Comissão Total', fr: 'Commission Totale' },
    'dash.today_clicks': { es: 'Clics Hoy', en: 'Today Clicks', pt: 'Cliques Hoje', fr: "Clics Aujourd'hui" },
    'dash.today_conversions': { es: 'Conversiones Hoy', en: 'Today Conversions', pt: 'Conversões Hoje', fr: "Conversions Aujourd'hui" },
    'dash.pending_commission': { es: 'Comisión Pendiente', en: 'Pending Commission', pt: 'Comissão Pendente', fr: 'Commission en Attente' },
    'dash.top_affiliates': { es: 'Top Afiliados', en: 'Top Affiliates', pt: 'Top Afiliados', fr: 'Top Affiliés' },

    // ============================================
    // AFFILIATES
    // ============================================
    'aff.title': { es: 'Afiliados', en: 'Affiliates', pt: 'Afiliados', fr: 'Affiliés' },
    'aff.add': { es: '+ Agregar Afiliado', en: '+ Add Affiliate', pt: '+ Adicionar Afiliado', fr: '+ Ajouter Affilié' },
    'aff.name': { es: 'Nombre', en: 'Name', pt: 'Nome', fr: 'Nom' },
    'aff.rank': { es: 'Rango', en: 'Rank', pt: 'Ranking', fr: 'Rang' },
    'aff.balance': { es: 'Balance', en: 'Balance', pt: 'Saldo', fr: 'Solde' },
    'aff.clicks': { es: 'Clics', en: 'Clicks', pt: 'Cliques', fr: 'Clics' },
    'aff.conversions': { es: 'Conversiones', en: 'Conversions', pt: 'Conversões', fr: 'Conversions' },
    'aff.approve': { es: 'Aprobar', en: 'Approve', pt: 'Aprovar', fr: 'Approuver' },
    'aff.suspend': { es: 'Suspender', en: 'Suspend', pt: 'Suspender', fr: 'Suspendre' },
    'aff.change_rank': { es: 'Cambiar Rango', en: 'Change Rank', pt: 'Mudar Ranking', fr: 'Changer Rang' },
    'aff.approved': { es: 'Aprobado', en: 'Approved', pt: 'Aprovado', fr: 'Approuvé' },
    'aff.pending': { es: 'Pendiente', en: 'Pending', pt: 'Pendente', fr: 'En attente' },
    'aff.suspended': { es: 'Suspendido', en: 'Suspended', pt: 'Suspenso', fr: 'Suspendu' },

    // ============================================
    // CAMPAIGNS & PRODUCTS
    // ============================================
    'camp.title': { es: 'Campañas', en: 'Campaigns', pt: 'Campanhas', fr: 'Campagnes' },
    'camp.create': { es: '+ Crear Campaña', en: '+ Create Campaign', pt: '+ Criar Campanha', fr: '+ Créer Campagne' },
    'camp.name': { es: 'Nombre', en: 'Name', pt: 'Nome', fr: 'Nom' },
    'camp.url': { es: 'URL', en: 'URL', pt: 'URL', fr: 'URL' },
    'camp.commission_type': { es: 'Tipo de Comisión', en: 'Commission Type', pt: 'Tipo de Comissão', fr: 'Type de Commission' },
    'prod.title': { es: 'Productos y Goals', en: 'Products & Goals', pt: 'Produtos e Metas', fr: 'Produits et Objectifs' },
    'prod.add': { es: '+ Agregar Producto', en: '+ Add Product', pt: '+ Adicionar Produto', fr: '+ Ajouter Produit' },
    'prod.add_goal': { es: '+ Goal', en: '+ Goal', pt: '+ Meta', fr: '+ Objectif' },
    'prod.category': { es: 'Categoría', en: 'Category', pt: 'Categoria', fr: 'Catégorie' },
    'prod.price': { es: 'Precio', en: 'Price', pt: 'Preço', fr: 'Prix' },
    'prod.recurring': { es: 'Recurrente', en: 'Recurring', pt: 'Recorrente', fr: 'Récurrent' },

    // ============================================
    // CONVERSIONS & RENEWALS
    // ============================================
    'conv.title': { es: 'Conversiones', en: 'Conversions', pt: 'Conversões', fr: 'Conversions' },
    'conv.approve': { es: 'Aprobar', en: 'Approve', pt: 'Aprovar', fr: 'Approuver' },
    'conv.reject': { es: 'Rechazar', en: 'Reject', pt: 'Rejeitar', fr: 'Rejeter' },
    'conv.order': { es: 'Pedido', en: 'Order', pt: 'Pedido', fr: 'Commande' },
    'conv.method': { es: 'Método', en: 'Method', pt: 'Método', fr: 'Méthode' },
    'renew.title': { es: 'Renovaciones', en: 'Renewals', pt: 'Renovações', fr: 'Renouvellements' },
    'renew.add': { es: '+ Agregar Renovación', en: '+ Add Renewal', pt: '+ Adicionar Renovação', fr: '+ Ajouter Renouvellement' },
    'renew.upcoming': { es: 'Próximas Renovaciones', en: 'Upcoming Renewals', pt: 'Próximas Renovações', fr: 'Renouvellements à Venir' },
    'renew.policy': { es: 'Póliza', en: 'Policy', pt: 'Apólice', fr: 'Police' },
    'renew.period': { es: 'Período', en: 'Period', pt: 'Período', fr: 'Période' },

    // ============================================
    // SALES REPORTS
    // ============================================
    'report.title': { es: 'Reportes de Ventas', en: 'Sales Reports', pt: 'Relatórios de Vendas', fr: 'Rapports de Ventes' },
    'report.by_agent': { es: 'Por Agente', en: 'By Agent', pt: 'Por Agente', fr: 'Par Agent' },
    'report.by_campaign': { es: 'Por Campaña', en: 'By Campaign', pt: 'Por Campanha', fr: 'Par Campagne' },
    'report.by_rank': { es: 'Por Rango', en: 'By Rank', pt: 'Por Ranking', fr: 'Par Rang' },
    'report.this_month': { es: 'Este Mes', en: 'This Month', pt: 'Este Mês', fr: 'Ce Mois' },
    'report.vs_last': { es: 'vs mes anterior', en: 'vs last month', pt: 'vs mês anterior', fr: 'vs mois précédent' },
    'report.sales': { es: 'Ventas', en: 'Sales', pt: 'Vendas', fr: 'Ventes' },
    'report.revenue': { es: 'Ingresos', en: 'Revenue', pt: 'Receita', fr: 'Revenus' },
    'report.active_agents': { es: 'Agentes Activos', en: 'Active Agents', pt: 'Agentes Ativos', fr: 'Agents Actifs' },

    // ============================================
    // PAYOUTS & WALLET
    // ============================================
    'pay.title': { es: 'Pagos', en: 'Payouts', pt: 'Pagamentos', fr: 'Paiements' },
    'pay.create': { es: '+ Crear Pago', en: '+ Create Payout', pt: '+ Criar Pagamento', fr: '+ Créer Paiement' },
    'pay.mark_paid': { es: 'Marcar Pagado', en: 'Mark Paid', pt: 'Marcar Pago', fr: 'Marquer Payé' },
    'pay.completed': { es: 'Completado', en: 'Completed', pt: 'Concluído', fr: 'Terminé' },
    'wallet.title': { es: 'Mi Cuenta', en: 'My Account', pt: 'Minha Conta', fr: 'Mon Compte' },
    'wallet.available': { es: 'Balance Disponible', en: 'Available Balance', pt: 'Saldo Disponível', fr: 'Solde Disponible' },
    'wallet.pending': { es: 'Pendiente', en: 'Pending', pt: 'Pendente', fr: 'En attente' },
    'wallet.earned': { es: 'Total Ganado', en: 'Total Earned', pt: 'Total Ganho', fr: 'Total Gagné' },
    'wallet.withdrawn': { es: 'Retirado', en: 'Withdrawn', pt: 'Retirado', fr: 'Retiré' },
    'wallet.withdraw': { es: 'Solicitar Retiro', en: 'Request Withdrawal', pt: 'Solicitar Saque', fr: 'Demander Retrait' },
    'wallet.transactions': { es: 'Ver Transacciones', en: 'View Transactions', pt: 'Ver Transações', fr: 'Voir Transactions' },
    'wallet.schedule_on_request': { es: 'Retira cuando quieras', en: 'Withdraw anytime', pt: 'Saque a qualquer momento', fr: 'Retrait à tout moment' },
    'wallet.schedule_weekly': { es: 'Pago semanal', en: 'Paid weekly', pt: 'Pago semanal', fr: 'Paiement hebdomadaire' },
    'wallet.schedule_biweekly': { es: 'Pago quincenal', en: 'Paid biweekly', pt: 'Pago quinzenal', fr: 'Paiement bimensuel' },
    'wallet.schedule_monthly': { es: 'Pago mensual', en: 'Paid monthly', pt: 'Pago mensal', fr: 'Paiement mensuel' },

    // ============================================
    // RANKS
    // ============================================
    'rank.title': { es: 'Rangos y Comisiones', en: 'Ranks & Commissions', pt: 'Rankings e Comissões', fr: 'Rangs et Commissions' },
    'rank.evaluate': { es: 'Evaluar Ascensos', en: 'Evaluate Promotions', pt: 'Avaliar Promoções', fr: 'Évaluer Promotions' },
    'rank.override_mode': { es: 'Modo de Override', en: 'Override Mode', pt: 'Modo de Override', fr: "Mode d'Override" },
    'rank.fixed': { es: 'Fijo (% + $ por rango)', en: 'Fixed (% + $ per rank)', pt: 'Fixo (% + $ por ranking)', fr: 'Fixe (% + $ par rang)' },
    'rank.difference': { es: 'Diferencia (estándar seguros)', en: 'Difference (insurance standard)', pt: 'Diferença (padrão seguros)', fr: 'Différence (standard assurance)' },
    'rank.direct': { es: 'Directo', en: 'Direct', pt: 'Direto', fr: 'Direct' },
    'rank.override': { es: 'Override', en: 'Override', pt: 'Override', fr: 'Override' },
    'rank.commission_matrix': { es: 'Matriz de Comisiones', en: 'Commission Matrix', pt: 'Matriz de Comissões', fr: 'Matrice de Commissions' },

    // ============================================
    // GROUPS
    // ============================================
    'group.title': { es: 'Grupos de Comisión', en: 'Commission Groups', pt: 'Grupos de Comissão', fr: 'Groupes de Commission' },
    'group.create': { es: '+ Crear Grupo', en: '+ Create Group', pt: '+ Criar Grupo', fr: '+ Créer Groupe' },
    'group.members': { es: 'Miembros', en: 'Members', pt: 'Membros', fr: 'Membres' },
    'group.manager': { es: 'Manager', en: 'Manager', pt: 'Gerente', fr: 'Manager' },

    // ============================================
    // FRAUD
    // ============================================
    'fraud.title': { es: 'Detección de Fraude', en: 'Fraud Detection', pt: 'Detecção de Fraude', fr: 'Détection de Fraude' },
    'fraud.block_ip': { es: 'Bloquear IP', en: 'Block IP', pt: 'Bloquear IP', fr: 'Bloquer IP' },
    'fraud.unblock': { es: 'Desbloquear', en: 'Unblock', pt: 'Desbloquear', fr: 'Débloquer' },
    'fraud.suspicious': { es: 'IPs Sospechosas', en: 'Suspicious IPs', pt: 'IPs Suspeitos', fr: 'IPs Suspectes' },
    'fraud.blocked': { es: 'IPs Bloqueadas', en: 'Blocked IPs', pt: 'IPs Bloqueados', fr: 'IPs Bloquées' },
    'fraud.alerts': { es: 'Alertas de Fraude', en: 'Fraud Alerts', pt: 'Alertas de Fraude', fr: 'Alertes de Fraude' },

    // ============================================
    // LOGS
    // ============================================
    'log.title': { es: 'Registros y Auditoría', en: 'Logs & Audit', pt: 'Registros e Auditoria', fr: 'Journaux et Audit' },
    'log.postbacks': { es: 'Registros de Postback', en: 'Postback Logs', pt: 'Registros de Postback', fr: 'Journaux Postback' },
    'log.activity': { es: 'Registro de Actividad', en: 'Activity Log', pt: 'Registro de Atividade', fr: "Journal d'Activité" },
    'log.total_requests': { es: 'Total Solicitudes', en: 'Total Requests', pt: 'Total Requisições', fr: 'Total Requêtes' },
    'log.today': { es: 'Hoy', en: 'Today', pt: 'Hoje', fr: "Aujourd'hui" },
    'log.errors': { es: 'Errores', en: 'Errors', pt: 'Erros', fr: 'Erreurs' },
    'log.avg_processing': { es: 'Tiempo Promedio', en: 'Avg Processing', pt: 'Tempo Médio', fr: 'Temps Moyen' },

    // ============================================
    // SETTINGS
    // ============================================
    'set.title': { es: 'Configuración', en: 'Settings', pt: 'Configurações', fr: 'Paramètres' },
    'set.payout_schedule': { es: 'Calendario de Pagos', en: 'Payout Schedule', pt: 'Calendário de Pagamentos', fr: 'Calendrier de Paiements' },
    'set.payment_providers': { es: 'Proveedores de Pago', en: 'Payment Providers', pt: 'Provedores de Pagamento', fr: 'Fournisseurs de Paiement' },
    'set.webhooks': { es: 'Webhooks', en: 'Webhooks', pt: 'Webhooks', fr: 'Webhooks' },
    'set.api_keys': { es: 'Claves API', en: 'API Keys', pt: 'Chaves API', fr: 'Clés API' },
    'set.schedule': { es: 'Frecuencia', en: 'Schedule', pt: 'Frequência', fr: 'Fréquence' },
    'set.on_request': { es: 'Por solicitud', en: 'On Request', pt: 'Sob demanda', fr: 'Sur demande' },
    'set.weekly': { es: 'Semanal', en: 'Weekly', pt: 'Semanal', fr: 'Hebdomadaire' },
    'set.biweekly': { es: 'Quincenal', en: 'Biweekly', pt: 'Quinzenal', fr: 'Bimensuel' },
    'set.monthly': { es: 'Mensual', en: 'Monthly', pt: 'Mensal', fr: 'Mensuel' },
    'set.min_payout': { es: 'Pago Mínimo', en: 'Min Payout', pt: 'Pagamento Mínimo', fr: 'Paiement Minimum' },
    'set.hold_days': { es: 'Días de Retención', en: 'Hold Days', pt: 'Dias de Retenção', fr: 'Jours de Rétention' },
    'set.auto_approve': { es: 'Auto-aprobar', en: 'Auto-Approve', pt: 'Auto-aprovar', fr: 'Auto-approuver' },

    // ============================================
    // AI ASSISTANT
    // ============================================
    'ai.placeholder': { es: 'Pregunta a la AI: "Crea una campaña de seguro de vida con comisiones por rango..."', en: 'Ask AI: "Create a life insurance campaign with rank commissions..."', pt: 'Pergunte à IA: "Crie uma campanha de seguro de vida com comissões por ranking..."', fr: "Demandez à l'IA : \"Créez une campagne d'assurance vie avec commissions par rang...\"" },
    'ai.create': { es: 'AI Crear', en: 'AI Create', pt: 'IA Criar', fr: 'IA Créer' },
    'ai.thinking': { es: 'Pensando...', en: 'Thinking...', pt: 'Pensando...', fr: 'Réflexion...' },
    'ai.apply_config': { es: 'Aplicar esta Configuración', en: 'Apply This Configuration', pt: 'Aplicar esta Configuração', fr: 'Appliquer cette Configuration' },
    'ai.creating': { es: 'Creando...', en: 'Creating...', pt: 'Criando...', fr: 'Création...' },
    'ai.created': { es: '¡Creado!', en: 'Created!', pt: 'Criado!', fr: 'Créé !' },

    // ============================================
    // TEAM (Affiliate Portal)
    // ============================================
    'team.title': { es: 'Mi Equipo', en: 'My Team', pt: 'Minha Equipe', fr: 'Mon Équipe' },
    'team.direct_recruits': { es: 'Reclutas Directos', en: 'Direct Recruits', pt: 'Recrutados Diretos', fr: 'Recrues Directes' },
    'team.total_team': { es: 'Total Equipo', en: 'Total Team', pt: 'Total Equipe', fr: 'Équipe Totale' },
    'team.team_revenue': { es: 'Ingresos del Equipo', en: 'Team Revenue', pt: 'Receita da Equipe', fr: "Revenus de l'Équipe" },
    'team.override_earnings': { es: 'Ganancias Override', en: 'Override Earnings', pt: 'Ganhos Override', fr: 'Gains Override' },
    'team.by_level': { es: 'Equipo por Nivel', en: 'Team by Level', pt: 'Equipe por Nível', fr: 'Équipe par Niveau' },
    'team.tree': { es: 'Árbol de Equipo', en: 'Team Tree', pt: 'Árvore da Equipe', fr: "Arbre de l'Équipe" },
    'team.top_performers': { es: 'Top Performers', en: 'Top Performers', pt: 'Top Performers', fr: 'Meilleurs Performeurs' },
    'team.tracking_links': { es: 'Tus Links de Tracking', en: 'Your Tracking Links', pt: 'Seus Links de Rastreamento', fr: 'Vos Liens de Suivi' },
    'team.referral_link': { es: 'Link de Reclutamiento', en: 'Referral Link', pt: 'Link de Recrutamento', fr: 'Lien de Parrainage' },
    'team.coupons': { es: 'Tus Cupones', en: 'Your Coupons', pt: 'Seus Cupons', fr: 'Vos Coupons' },
    'team.notifications': { es: 'Notificaciones', en: 'Notifications', pt: 'Notificações', fr: 'Notifications' },
    'team.stats': { es: 'Estadísticas', en: 'Stats', pt: 'Estatísticas', fr: 'Statistiques' },
    'team.alerts': { es: 'Alertas', en: 'Alerts', pt: 'Alertas', fr: 'Alertes' },
};

// ============================================
// i18n ENGINE
// ============================================

let currentLang = localStorage.getItem('mr_lang') || navigator.language?.substring(0, 2) || 'en';
if (!['es', 'en', 'pt', 'fr'].includes(currentLang)) currentLang = 'en';

function t(key, fallback) {
    const entry = TRANSLATIONS[key];
    if (!entry) return fallback || key;
    return entry[currentLang] || entry['en'] || fallback || key;
}

function setLanguage(lang) {
    if (!['es', 'en', 'pt', 'fr'].includes(lang)) return;
    currentLang = lang;
    localStorage.setItem('mr_lang', lang);
    applyTranslations();
}

function applyTranslations() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translated;
        } else {
            el.textContent = translated;
        }
    });
    // Translate data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
}

function getLanguageSelector() {
    return `<select onchange="setLanguage(this.value)" style="padding:6px 10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#94a3b8;font-size:12px;cursor:pointer">
        <option value="es" ${currentLang === 'es' ? 'selected' : ''}>Español</option>
        <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
        <option value="pt" ${currentLang === 'pt' ? 'selected' : ''}>Português</option>
        <option value="fr" ${currentLang === 'fr' ? 'selected' : ''}>Français</option>
    </select>`;
}
