/**
 * Billing Manager - Google Play Billing integration module
 * Prepara o aplicativo para assinatura premium via Play Store / App Store
 */

export const BillingManager = {
    // Configurações dos identificadores de produtos da Play Store
    PRODUCTS: {
        MONTHLY: 'nossabiblialivre.premium.mensal',
        ANNUAL: 'nossabiblialivre.premium.anual'
    },

    isInitialized: false,

    /**
     * Inicializa a integração de compras In-App
     */
    async init(onStatusUpdate) {
        console.log('[Billing] Inicializando sistema de faturamento...');
        
        // Verifica se está rodando no ambiente Capacitor/Cordova (Dispositivo Móvel)
        const isDevice = window.cordova !== undefined || window.Capacitor !== undefined;

        if (isDevice && window.store) {
            this.initCordovaPurchase(onStatusUpdate);
        } else {
            console.log('[Billing] Rodando no Navegador. Modo Simulação ativo.');
            this.isInitialized = true;
            // Carrega estado simulado do localStorage
            const localPremium = localStorage.getItem('nb-premium-status') === 'true';
            onStatusUpdate(localPremium);
        }
    },

    /**
     * Configuração do plugin cordova-plugin-purchase (usado com Capacitor)
     */
    initCordovaPurchase(onStatusUpdate) {
        const store = window.store;

        // Registra produtos da Google Play
        store.register({
            id: this.PRODUCTS.MONTHLY,
            type: store.PAID_SUBSCRIPTION
        });

        store.register({
            id: this.PRODUCTS.ANNUAL,
            type: store.PAID_SUBSCRIPTION
        });

        // Evento quando o status de algum produto/assinatura é atualizado
        store.when('subscription').updated((product) => {
            console.log(`[Billing] Produto atualizado: ${product.id} - Owned: ${product.owned}`);
            
            // Se o usuário possui qualquer uma das assinaturas ativas
            const hasActiveSub = store.get(this.PRODUCTS.MONTHLY).owned || 
                               store.get(this.PRODUCTS.ANNUAL).owned;
            
            localStorage.setItem('nb-premium-status', hasActiveSub ? 'true' : 'false');
            onStatusUpdate(hasActiveSub);
        });

        // Trata erros de compras
        store.error((error) => {
            console.error('[Billing] Erro na loja:', error.code, error.message);
        });

        // Inicializa a loja
        store.refresh();
        this.isInitialized = true;
    },

    /**
     * Inicia o fluxo de compra
     */
    async purchase(planId) {
        console.log(`[Billing] Iniciando compra do plano: ${planId}`);
        const productId = planId === 'annual' ? this.PRODUCTS.ANNUAL : this.PRODUCTS.MONTHLY;

        const isDevice = window.cordova !== undefined || window.Capacitor !== undefined;

        if (isDevice && window.store) {
            // Executa a compra nativa pela Google Play Store
            window.store.order(productId);
            return { success: true, mode: 'native' };
        } else {
            // Simulação de sucesso no ambiente de desenvolvimento/web
            return new Promise((resolve) => {
                setTimeout(() => {
                    localStorage.setItem('nb-premium-status', 'true');
                    resolve({ success: true, mode: 'simulation' });
                }, 1000);
            });
        }
    },

    /**
     * Restaura compras anteriores
     */
    async restore() {
        console.log('[Billing] Solicitando restauração de compras...');
        const isDevice = window.cordova !== undefined || window.Capacitor !== undefined;

        if (isDevice && window.store) {
            window.store.refresh();
            return { success: true, mode: 'native' };
        } else {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ success: true, mode: 'simulation' });
                }, 800);
            });
        }
    }
};
