import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, recipes: 0, categories: 0, comments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [serverChartData, setServerChartData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/api/admin/dashboard');
        if (res.data.success) {
          setStats(res.data.stats);
          setServerChartData(res.data.chartData);
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/');
        } else {
          setError('Không thể tải trang Dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  if (loading) return <AdminLayout title="Bảng điều khiển"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Bảng điều khiển"><div className="error-msg">{error}</div></AdminLayout>;

  const labels = serverChartData ? Object.keys(serverChartData.users) : [];
  const usersData = serverChartData ? Object.values(serverChartData.users) : [];
  const recipesData = serverChartData ? Object.values(serverChartData.recipes) : [];

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Công thức mới',
        data: recipesData,
        borderColor: '#f97316', // Orange matching Steam primary accent
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'var(--color-bg-body)',
        pointBorderColor: '#f97316',
        pointHoverBackgroundColor: '#f97316',
        pointHoverBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Người dùng mới',
        data: usersData,
        borderColor: '#38bdf8', // Light blue
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        tension: 0.4,
        fill: true,
        borderDash: [5, 5],
        pointBackgroundColor: 'var(--color-bg-body)',
        pointBorderColor: '#38bdf8',
        pointHoverBackgroundColor: '#38bdf8',
        pointHoverBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--color-text-main)',
          font: { family: "'Motiva Sans', 'Inter', sans-serif", size: 13 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: 'rgba(16, 24, 34, 0.9)',
        titleColor: '#fff',
        bodyColor: 'var(--color-text-main)',
        borderColor: 'var(--color-border)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--color-text-muted)',
          font: { family: "'Motiva Sans', 'Inter', sans-serif", size: 12 }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--color-text-muted)',
          font: { family: "'Motiva Sans', 'Inter', sans-serif", size: 12 }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  const StatCard = ({ title, value, icon, color, gradient }) => (
    <div style={{
      background: `linear-gradient(135deg, rgba(27, 40, 56, 0.9) 0%, rgba(16, 24, 34, 0.95) 100%)`,
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      cursor: 'default',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0, left: 0,
        background: `radial-gradient(circle at top right, ${gradient}, transparent 70%)`,
        opacity: 0.5,
        pointerEvents: 'none'
      }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {title}
          </div>
          <div style={{ 
            background: `rgba(${color.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(',')}, 0.15)`,
            color: color,
            width: '40px', height: '40px', 
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px'
          }}>
            <i className={icon}></i>
          </div>
        </div>
        <div style={{ fontSize: '36px', fontWeight: '300', color: '#fff', letterSpacing: '-1px' }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Bảng điều khiển">
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        {/* Tiêu đề & Lời chào */}
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '28px', margin: '0 0 5px 0', color: '#fff', fontWeight: '300' }}>Tổng quan hệ thống</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '15px' }}>Số liệu thống kê và hoạt động gần đây</p>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <i className="fa-regular fa-calendar" style={{ marginRight: '8px' }}></i>
            Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}
          </div>
        </div>

        {/* 4 Thẻ chỉ số tổng quan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '35px' }}>
          <StatCard 
            title="Tổng người dùng" 
            value={stats.users} 
            icon="fa-solid fa-users" 
            color="#38bdf8" 
            gradient="rgba(56, 189, 248, 0.15)"
          />
          <StatCard 
            title="Tổng công thức" 
            value={stats.recipes} 
            icon="fa-solid fa-utensils" 
            color="#f97316" 
            gradient="rgba(249, 115, 22, 0.15)"
          />
          <StatCard 
            title="Danh mục món ăn" 
            value={stats.categories} 
            icon="fa-solid fa-layer-group" 
            color="#10b981" 
            gradient="rgba(16, 185, 129, 0.15)"
          />
          <StatCard 
            title="Bình luận & Đánh giá" 
            value={stats.comments} 
            icon="fa-solid fa-comments" 
            color="#ec4899" 
            gradient="rgba(236, 72, 153, 0.15)"
          />
        </div>

        {/* Khu vực Biểu đồ */}
        <div style={{ 
          background: 'rgba(27, 40, 56, 0.6)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '18px', fontWeight: '500' }}>Biểu đồ tăng trưởng</h3>
              <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '13px' }}>So sánh lượng người dùng và công thức mới trong 7 ngày qua</p>
            </div>
            <button className="btn-secondary" onClick={() => window.location.reload()} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <i className="fa-solid fa-rotate-right"></i> Làm mới
            </button>
          </div>
          
          <div style={{ height: '380px', width: '100%', position: 'relative' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
