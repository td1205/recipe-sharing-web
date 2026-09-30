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

  // Dữ liệu từ API
  const labels = serverChartData ? Object.keys(serverChartData.users) : [];
  const usersData = serverChartData ? Object.values(serverChartData.users) : [];
  const recipesData = serverChartData ? Object.values(serverChartData.recipes) : [];

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Công thức mới',
        data: recipesData,
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(217, 119, 6, 0.2)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Người dùng mới',
        data: usersData,
        borderColor: 'var(--color-text-main)',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderDash: [5, 5],
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <AdminLayout title="Bảng điều khiển">
      {/* 4 Thẻ chỉ số tổng quan */}
      <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="stat-card" style={{ background: 'var(--color-bg-card)', padding: '24px', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>TỔNG NGƯỜI DÙNG</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats.users}</p>
            <i className="fa-solid fa-users" style={{ fontSize: '24px', color: 'var(--color-primary)', opacity: 0.5 }}></i>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-bg-card)', padding: '24px', border: '1px solid var(--color-border)', borderLeft: '4px solid #10B981' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>TỔNG CÔNG THỨC</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats.recipes}</p>
            <i className="fa-solid fa-utensils" style={{ fontSize: '24px', color: '#10B981', opacity: 0.5 }}></i>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-bg-card)', padding: '24px', border: '1px solid var(--color-border)', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>DANH MỤC</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats.categories}</p>
            <i className="fa-solid fa-layer-group" style={{ fontSize: '24px', color: '#3B82F6', opacity: 0.5 }}></i>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-bg-card)', padding: '24px', border: '1px solid var(--color-border)', borderLeft: '4px solid #EC4899' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>BÌNH LUẬN</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats.comments}</p>
            <i className="fa-solid fa-comments" style={{ fontSize: '24px', color: '#EC4899', opacity: 0.5 }}></i>
          </div>
        </div>
      </div>

      {/* Khu vực Biểu đồ */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--color-text-main)' }}>Biểu đồ tăng trưởng 7 ngày qua</h3>
        <div style={{ height: '350px', width: '100%' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
