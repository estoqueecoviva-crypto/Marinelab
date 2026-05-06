/* ============================================
   MARINE LAB - Reports (PDF / Excel)
   ============================================ */

const Reports = {

    /* ============ PDF da viagem ============ */
    exportTripPDF(trip) {
        if (!trip) return;
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const expenses = App.getTripExpenses(trip.id).sort((a,b) => {
                return ((a.expense_date||'') + (a.expense_time||'')).localeCompare((b.expense_date||'') + (b.expense_time||''));
            });
            const total = App.getTripTotal(trip.id);
            const budget = parseFloat(trip.budget || 0);

            // Header com background náutico
            doc.setFillColor(16, 42, 67);
            doc.rect(0, 0, 210, 42, 'F');

            // Linha dourada
            doc.setFillColor(201, 169, 97);
            doc.rect(0, 42, 210, 1.5, 'F');

            // Logo / Brand
            doc.setTextColor(201, 169, 97);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('⚓ MARINE LAB', 14, 14);
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.text('CONTROLE DE VIAGENS CORPORATIVAS', 14, 19);

            // Título do relatório
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Relatório Final de Viagem', 14, 32);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 38);

            // Dados da viagem
            let y = 52;
            doc.setTextColor(16, 42, 67);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(trip.name, 14, y);
            y += 7;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(72, 101, 129);
            doc.text(`Funcionário: ${trip.employee_name}`, 14, y);
            doc.text(`Status: ${Utils.statusLabel(trip.status)}`, 110, y);
            y += 5;
            doc.text(`Local: ${trip.city}${trip.state ? '/' + trip.state : ''}`, 14, y);
            doc.text(`Período: ${Utils.formatDate(trip.start_date)} a ${Utils.formatDate(trip.end_date)}`, 110, y);
            y += 5;
            if (trip.purpose) {
                doc.text(`Objetivo: ${trip.purpose}`, 14, y);
                y += 5;
            }

            // Box de totais
            y += 4;
            doc.setFillColor(240, 244, 248);
            doc.rect(14, y, 182, 22, 'F');
            doc.setFillColor(201, 169, 97);
            doc.rect(14, y, 1.5, 22, 'F');

            doc.setTextColor(72, 101, 129);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL GERAL DA VIAGEM', 20, y + 7);
            doc.setFontSize(20);
            doc.setTextColor(16, 42, 67);
            doc.text(Utils.formatCurrency(total), 20, y + 17);

            doc.setFontSize(8);
            doc.setTextColor(72, 101, 129);
            doc.setFont('helvetica', 'normal');
            doc.text(`${expenses.length} lançamentos`, 130, y + 7);
            if (budget > 0) {
                doc.text(`Orçamento previsto: ${Utils.formatCurrency(budget)}`, 130, y + 12);
                const pct = ((total/budget)*100).toFixed(1);
                doc.text(`Utilizado: ${pct}%`, 130, y + 17);
            }
            y += 28;

            // Por categoria
            const byCat = {};
            expenses.forEach(e => {
                const c = e.category || 'outros';
                byCat[c] = (byCat[c] || 0) + parseFloat(e.amount||0);
            });
            if (Object.keys(byCat).length > 0) {
                doc.setFontSize(11);
                doc.setTextColor(16, 42, 67);
                doc.setFont('helvetica', 'bold');
                doc.text('Total por Categoria', 14, y);
                y += 4;

                doc.autoTable({
                    startY: y,
                    head: [['Categoria', 'Valor', '% do Total']],
                    body: Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v]) => [
                        Utils.categoryLabel(c),
                        Utils.formatCurrency(v),
                        total > 0 ? ((v/total)*100).toFixed(1) + '%' : '0%'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [16, 42, 67], textColor: [201, 169, 97], fontSize: 9 },
                    bodyStyles: { fontSize: 9 },
                    margin: { left: 14, right: 14 }
                });
                y = doc.lastAutoTable.finalY + 8;
            }

            // Lista cronológica
            doc.setFontSize(11);
            doc.setTextColor(16, 42, 67);
            doc.setFont('helvetica', 'bold');
            doc.text('Lançamentos Cronológicos', 14, y);
            y += 4;

            doc.autoTable({
                startY: y,
                head: [['Data/Hora', 'Quem', 'Categoria', 'Local', 'Pagto', 'Valor']],
                body: expenses.map(e => [
                    `${Utils.formatDate(e.expense_date)}\n${e.expense_time || ''}`,
                    e.employee_name || '-',
                    Utils.categoryLabel(e.category) + (e.category_other ? ` (${e.category_other})` : ''),
                    e.location || '-',
                    Utils.paymentLabel(e.payment_method),
                    Utils.formatCurrency(e.amount)
                ]),
                theme: 'striped',
                headStyles: { fillColor: [16, 42, 67], textColor: [201, 169, 97], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
                columnStyles: {
                    5: { halign: 'right', fontStyle: 'bold' }
                }
            });

            // Total final no rodapé
            y = doc.lastAutoTable.finalY + 6;
            doc.setFillColor(201, 169, 97);
            doc.rect(14, y, 182, 12, 'F');
            doc.setTextColor(16, 42, 67);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL GERAL', 20, y + 7.5);
            doc.text(Utils.formatCurrency(total), 196, y + 7.5, { align: 'right' });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                doc.text(`Marine Lab • Controle de Viagens • Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
            }

            const filename = `MarineLab_${trip.name.replace(/[^a-z0-9]/gi,'_')}_${Utils.todayISO()}.pdf`;
            doc.save(filename);
            Utils.showToast('PDF gerado com sucesso!', 'success');
        } catch (err) {
            Utils.showToast('Erro ao gerar PDF', 'error');
        }
    },

    /* ============ Excel da viagem ============ */
    exportTripExcel(trip) {
        if (!trip) return;
        try {
            const expenses = App.getTripExpenses(trip.id).sort((a,b) => {
                return ((a.expense_date||'') + (a.expense_time||'')).localeCompare((b.expense_date||'') + (b.expense_time||''));
            });
            const total = App.getTripTotal(trip.id);

            const wb = XLSX.utils.book_new();

            // Aba 1: Resumo
            const resumo = [
                ['MARINE LAB - RELATÓRIO DE VIAGEM'],
                [],
                ['Viagem', trip.name],
                ['Funcionário', trip.employee_name],
                ['Local', `${trip.city}${trip.state ? '/' + trip.state : ''}`],
                ['Período', `${Utils.formatDate(trip.start_date)} a ${Utils.formatDate(trip.end_date)}`],
                ['Status', Utils.statusLabel(trip.status)],
                ['Objetivo', trip.purpose || '-'],
                ['Orçamento', parseFloat(trip.budget) || 0],
                ['Total Gasto', total],
                ['Lançamentos', expenses.length],
                [],
                ['POR CATEGORIA'],
                ['Categoria', 'Valor', '% Total']
            ];
            const byCat = {};
            expenses.forEach(e => {
                const c = e.category || 'outros';
                byCat[c] = (byCat[c] || 0) + parseFloat(e.amount||0);
            });
            Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([c,v]) => {
                resumo.push([Utils.categoryLabel(c), v, total > 0 ? (v/total)*100 : 0]);
            });
            const ws1 = XLSX.utils.aoa_to_sheet(resumo);
            ws1['!cols'] = [{wch:20},{wch:30},{wch:15}];
            XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

            // Aba 2: Lançamentos
            const headers = ['Data', 'Hora', 'Funcionário', 'Categoria', 'Especificação', 'Local', 'Pagamento', 'Valor (R$)', 'Status', 'Observações', 'GPS'];
            const rows = expenses.map(e => [
                Utils.formatDate(e.expense_date),
                e.expense_time || '',
                e.employee_name || '',
                Utils.categoryLabel(e.category),
                e.category_other || '',
                e.location || '',
                Utils.paymentLabel(e.payment_method),
                parseFloat(e.amount) || 0,
                Utils.statusLabel(e.approval_status || 'pendente'),
                e.notes || '',
                e.geolocation || ''
            ]);
            rows.push(['', '', '', '', '', '', 'TOTAL', total, '', '', '']);
            const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            ws2['!cols'] = [{wch:12},{wch:8},{wch:22},{wch:14},{wch:18},{wch:24},{wch:14},{wch:12},{wch:12},{wch:30},{wch:22}];
            XLSX.utils.book_append_sheet(wb, ws2, 'Lançamentos');

            const filename = `MarineLab_${trip.name.replace(/[^a-z0-9]/gi,'_')}_${Utils.todayISO()}.xlsx`;
            XLSX.writeFile(wb, filename);
            Utils.showToast('Excel exportado!', 'success');
        } catch (err) {
            Utils.showToast('Erro ao gerar Excel', 'error');
        }
    },

    /* ============ Excel consolidado de tudo ============ */
    exportAllExcel() {
        try {
            const wb = XLSX.utils.book_new();

            // Viagens
            const tripHeaders = ['Nome', 'Funcionário', 'Cidade', 'Estado', 'Início', 'Fim', 'Status', 'Objetivo', 'Orçamento', 'Total Gasto', 'Lançamentos'];
            const tripRows = App.cache.trips.map(t => {
                const total = App.getTripTotal(t.id);
                const cnt = App.getTripExpenses(t.id).length;
                return [t.name, t.employee_name, t.city, t.state, Utils.formatDate(t.start_date), Utils.formatDate(t.end_date), Utils.statusLabel(t.status), t.purpose || '', parseFloat(t.budget)||0, total, cnt];
            });
            const ws1 = XLSX.utils.aoa_to_sheet([tripHeaders, ...tripRows]);
            ws1['!cols'] = tripHeaders.map(() => ({wch: 18}));
            XLSX.utils.book_append_sheet(wb, ws1, 'Viagens');

            // Gastos
            const expHeaders = ['Data', 'Hora', 'Viagem', 'Funcionário', 'Categoria', 'Especificação', 'Local', 'Pagamento', 'Valor', 'Status', 'Observações'];
            const expRows = App.cache.expenses.map(e => [
                Utils.formatDate(e.expense_date), e.expense_time, e.trip_name, e.employee_name,
                Utils.categoryLabel(e.category), e.category_other || '', e.location, Utils.paymentLabel(e.payment_method),
                parseFloat(e.amount)||0, Utils.statusLabel(e.approval_status || 'pendente'), e.notes || ''
            ]);
            const ws2 = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
            ws2['!cols'] = expHeaders.map(() => ({wch: 18}));
            XLSX.utils.book_append_sheet(wb, ws2, 'Gastos');

            XLSX.writeFile(wb, `MarineLab_Consolidado_${Utils.todayISO()}.xlsx`);
            Utils.showToast('Excel consolidado exportado!', 'success');
        } catch (err) {
            Utils.showToast('Erro ao exportar', 'error');
        }
    }
};
