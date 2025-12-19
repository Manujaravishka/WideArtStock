const stockModel = require('../models/stockModel');
const historyModel = require('../models/historyModel');

class ReportController {
  // Generate daily report
  async generateDailyReport(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.body;
      const userId = req.user.id;
      
      // Get today's summary from history
      const todayHistory = await historyModel.getSummary(date, date);
      
      // Get current stock statistics
      const statistics = await stockModel.getStatistics();
      
      // Calculate low stock items
      const lowStockItems = await stockModel.getLowStock(1);
      
      // Calculate total value
      const totalValue = statistics.totalValue[0]?.value || 0;
      
      const report = {
        report_date: date,
        total_items_added: todayHistory[0]?.items_added || 0,
        total_items_updated: todayHistory[0]?.items_updated || 0,
        total_items_deleted: todayHistory[0]?.items_deleted || 0,
        total_value: totalValue,
        low_stock_items: lowStockItems.length,
        generated_by: userId,
        statistics: {
          total_items: statistics.totalItems[0]?.count || 0,
          by_category: statistics.categoryStats
        },
        low_stock_details: lowStockItems.slice(0, 10) // Limit to top 10
      };
      
      res.json({
        success: true,
        message: 'Daily report generated successfully',
        data: report
      });
    } catch (error) {
      console.error('Generate daily report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily report'
      });
    }
  }

  // Generate stock summary report
  async generateStockSummary(req, res) {
    try {
      const { format = 'json' } = req.query;
      
      const statistics = await stockModel.getStatistics();
      const lowStockItems = await stockModel.getLowStock(1);
      const allItems = await stockModel.getAll({ page: 1, limit: 1000 });
      
      const report = {
        generated_at: new Date().toISOString(),
        summary: {
          total_items: statistics.totalItems[0]?.count || 0,
          total_value: statistics.totalValue[0]?.value || 0,
          low_stock_count: lowStockItems.length,
          categories_count: statistics.categoryStats.length
        },
        by_category: statistics.categoryStats,
        low_stock_items: lowStockItems,
        top_items_by_value: allItems.items
          .sort((a, b) => b.total_value - a.total_value)
          .slice(0, 10)
      };
      
      // Handle different formats
      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=stock_summary.csv');
        return res.send(csv);
      }
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Generate stock summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate stock summary'
      });
    }
  }

  // Generate history report
  async generateHistoryReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }
      
      const summary = await historyModel.getSummary(startDate, endDate);
      const allHistory = await historyModel.getAll({
        page: 1,
        limit: 1000,
        startDate,
        endDate
      });
      
      const report = {
        period: { startDate, endDate },
        generated_at: new Date().toISOString(),
        summary: {
          total_days: summary.length,
          total_actions: summary.reduce((sum, day) => sum + day.total_actions, 0),
          items_added: summary.reduce((sum, day) => sum + day.items_added, 0),
          items_updated: summary.reduce((sum, day) => sum + day.items_updated, 0),
          items_deleted: summary.reduce((sum, day) => sum + day.items_deleted, 0)
        },
        daily_summary: summary,
        detailed_history: allHistory.items
      };
      
      if (format === 'csv') {
        const csv = this.convertHistoryToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=history_report_${startDate}_${endDate}.csv`);
        return res.send(csv);
      }
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Generate history report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate history report'
      });
    }
  }

  // Convert report to CSV
  convertToCSV(report) {
    let csv = 'Stock Summary Report\n';
    csv += `Generated: ${report.generated_at}\n\n`;
    
    csv += 'SUMMARY\n';
    csv += `Total Items,${report.summary.total_items}\n`;
    csv += `Total Value,$${report.summary.total_value}\n`;
    csv += `Low Stock Items,${report.summary.low_stock_count}\n`;
    csv += `Categories,${report.summary.categories_count}\n\n`;
    
    csv += 'BY CATEGORY\n';
    csv += 'Category,Item Count,Total Value\n';
    report.by_category.forEach(cat => {
      csv += `${cat.category},${cat.item_count},$${cat.total_value}\n`;
    });
    
    csv += '\nLOW STOCK ITEMS\n';
    csv += 'Name,Category,Quantity,Threshold,Status\n';
    report.low_stock_items.forEach(item => {
      csv += `${item.name},${item.category},${item.quantity},${item.low_stock_threshold},Low\n`;
    });
    
    csv += '\nTOP 10 ITEMS BY VALUE\n';
    csv += 'Name,Category,Quantity,Unit Price,Total Value\n';
    report.top_items_by_value.forEach(item => {
      csv += `${item.name},${item.category},${item.quantity},$${item.unit_price},$${item.total_value}\n`;
    });
    
    return csv;
  }

  // Convert history to CSV
  convertHistoryToCSV(report) {
    let csv = 'Stock History Report\n';
    csv += `Period: ${report.period.startDate} to ${report.period.endDate}\n`;
    csv += `Generated: ${report.generated_at}\n\n`;
    
    csv += 'SUMMARY\n';
    csv += `Total Days,${report.summary.total_days}\n`;
    csv += `Total Actions,${report.summary.total_actions}\n`;
    csv += `Items Added,${report.summary.items_added}\n`;
    csv += `Items Updated,${report.summary.items_updated}\n`;
    csv += `Items Deleted,${report.summary.items_deleted}\n\n`;
    
    csv += 'DAILY SUMMARY\n';
    csv += 'Date,Items Added,Items Updated,Items Deleted,Total Actions\n';
    report.daily_summary.forEach(day => {
      csv += `${day.date},${day.items_added},${day.items_updated},${day.items_deleted},${day.total_actions}\n`;
    });
    
    csv += '\nDETAILED HISTORY\n';
    csv += 'Date,Time,Item,Action,Quantity Change,Previous Qty,New Qty,User\n';
    report.detailed_history.forEach(history => {
      const date = new Date(history.created_at);
      csv += `${date.toISOString().split('T')[0]},`;
      csv += `${date.toTimeString().split(' ')[0]},`;
      csv += `${history.item_name},`;
      csv += `${history.action_type},`;
      csv += `${history.quantity_change},`;
      csv += `${history.previous_quantity},`;
      csv += `${history.new_quantity},`;
      csv += `${history.user_name}\n`;
    });
    
    return csv;
  }
}

module.exports = new ReportController();