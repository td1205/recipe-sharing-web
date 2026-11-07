import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './admin.css';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
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

const StatCard = ({ title, value }) => (
    <div className="admin-kpi">
      <div className="admin-kpi-label">{title}</div>
      <div className="admin-kpi-value">{value.toLocaleString('vi-VN')}</div>
    </div>
  );

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, recipes: 0, categories: 0, comments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [serverChartData, setServerChartData] = useState(null);
  const [recent, setRecent] = useState(null);
  const [days, setDays] = useState(7);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchDashboard = useCallback(async (rangeDays = 7) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/dashboard', { params: { days: rangeDays } });
      if (!res.data.success) {
        throw new Error('Invalid dashboard response');
      }
      setStats(res.data.stats);
      setServerChartData(res.data.chartData);
      setRecent(res.data.recent || null);
      setLastFetched(res.data.stats.lastFetched || new Date().toISOString());
    } catch (requestError) {
      if (requestError.response?.status === 401 || requestError.response?.status === 403) {
        setError('Phiên đăng nhập không còn quyền truy cập trang quản trị.');
      } else {
        setError('Không thể tải trang Dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- Fetching starts when the protected route mounts.
    fetchDashboard(7);
  }, [fetchDashboard]);

  if (loading) return <AdminLayout title="Bảng điều khiển"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Bảng điều khiển"><ErrorState message={error} onRetry={fetchDashboard} /></AdminLayout>;

  const labels = serverChartData ? Object.keys(serverChartData.users) : [];
  const usersData = serverChartData ? Object.values(serverChartData.users) : [];
  const recipesData = serverChartData ? Object.values(serverChartData.recipes) : [];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Công thức mới',
        data: recipesData,
        borderColor: '#e85d04',
        backgroundColor: 'rgba(232, 93, 4, 0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#e85d04',
        pointHoverBackgroundColor: '#e85d04',
        pointHoverBorderColor: '#ffffff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Người dùng mới',
        data: usersData,
        borderColor: '#8a8a8a',
        backgroundColor: 'rgba(138, 138, 138, 0.08)',
        tension: 0.4,
        fill: true,
        borderDash: [5, 5],
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#8a8a8a',
        pointHoverBackgroundColor: '#8a8a8a',
        pointHoverBorderColor: '#ffffff',
        pointRadius: 3,
        pointHoverRadius: 5,
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
          color: '#111111',
          font: { family: "Roboto, Arial, sans-serif", size: 13 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#111111',
        bodyColor: '#5a5a5a',
        borderColor: '#d0ccc2',
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
          color: 'rgba(17, 17, 17, 0.07)',
          drawBorder: false,
        },
        ticks: {
          color: '#5a5a5a',
          font: { family: "Roboto, Arial, sans-serif", size: 12 }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#5a5a5a',
          font: { family: "Roboto, Arial, sans-serif", size: 12 },
          maxTicksLimit: 10,
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };




  return (
    <AdminLayout title="Bảng điều khiển">
      <div className="admin-shell">

        {/* Tiêu đề & lời chào */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Tổng quan hệ thống</h1>
            <p className="admin-page-sub">Số liệu thống kê và hoạt động gần đây</p>
          </div>
          <div className="admin-updated">
            <i className="fa-regular fa-calendar" style={{ marginRight: '8px' }}></i>
            Cập nhật lần cuối: {lastFetched ? new Date(lastFetched).toLocaleTimeString('vi-VN') : '—'}
            <button className="admin-updated-btn" onClick={() => fetchDashboard(days)} aria-label="Làm mới số liệu">
              <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* 4 Thẻ chỉ số tổng quan */}
        <div className="admin-kpi-grid">
          <StatCard title="Tổng người dùng" value={stats.users} />
          <StatCard title="Tổng công thức" value={stats.recipes} />
          <StatCard title="Danh mục món ăn" value={stats.categories} />
          <StatCard title="Bình luận" value={stats.comments} />
        </div>

        {/* Khu vực Biểu đồ */}
        <div className="admin-section-header">
          <div>
            <h2 className="admin-section-title">Biểu đồ tăng trưởng</h2>
            <p className="admin-section-sub">Người dùng và công thức mới trong {days} ngày qua</p>
          </div>
          <div className="admin-range-group">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setDays(d); fetchDashboard(d); }}
                className={`admin-range-btn ${days === d ? 'active' : ''}`}
                aria-pressed={days === d}
              >
                {d} ngày
              </button>
            ))}
          </div>
        </div>

        <div className="admin-chart-box">
          <div style={{ height: '360px', width: '100%', position: 'relative' }}>
            <Line data={chartData} options={chartOptions} aria-label="Biểu đồ người dùng và công thức mới" role="img" />
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="admin-section-header">
          <div>
            <h2 className="admin-section-title">Hoạt động gần đây</h2>
            <p className="admin-section-sub">Người dùng, công thức và bình luận mới nhất</p>
          </div>
        </div>
        <div className="admin-feed-grid">
          <div className="admin-feed-card">
            <h3>Người dùng mới nhất</h3>
            {(recent?.users || []).map((u) => (
              <div key={u.id} className="admin-feed-row">
                <span className="admin-feed-main">{u.username}</span>
                <span className="admin-feed-time">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : ''}</span>
              </div>
            ))}
          </div>
          <div className="admin-feed-card">
            <h3>Công thức mới nhất</h3>
            {(recent?.recipes || []).map((r) => (
              <div key={r.id} className="admin-feed-row">
                <Link to={`/recipes/${r.id}`} className="admin-feed-main">{r.title}</Link>
                <span className="admin-feed-time">{r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}</span>
              </div>
            ))}
          </div>
          <div className="admin-feed-card">
            <h3>Bình luận mới nhất</h3>
            {(recent?.comments || []).map((c) => (
              <div key={c.id} className="admin-feed-row" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span className="admin-feed-main">{c.users?.username || 'Người dùng'}</span>
                  <span className="admin-feed-time">{c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''}</span>
                </div>
                <div className="admin-feed-sub">
                  trên «{c.recipes?.title || '—'}»: {String(c.content || '').slice(0, 40)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cần chú ý + Quick actions */}
        <div className="admin-note-grid">
          <div className="admin-note-card">
            <h3>Cần chú ý</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div className="admin-note-row">
                <span>Tài khoản đang bị khoá</span>
                <strong style={{ color: stats.bannedUsers > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>{stats.bannedUsers}</strong>
              </div>
              <div className="admin-note-row">
                <span>Công thức chưa có ảnh</span>
                <strong style={{ color: stats.recipesWithoutImage > 0 ? 'var(--color-primary)' : 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>{stats.recipesWithoutImage}</strong>
              </div>
              <div className="admin-note-row">
                <span>Bình luận cần rà soát</span>
                <Link to="/admin/comments">{stats.comments} →</Link>
              </div>
            </div>
          </div>
          <div className="admin-actions-card">
            <h3>Thao tác nhanh</h3>
            <Link to="/admin/users" className="admin-action-link">
              <i className="fa-solid fa-users" style={{ marginRight: '8px' }} aria-hidden="true"></i> Quản lý người dùng
            </Link>
            <Link to="/admin/recipes" className="admin-action-link">
              <i className="fa-solid fa-utensils" style={{ marginRight: '8px' }} aria-hidden="true"></i> Quản lý công thức
            </Link>
            <Link to="/admin/comments" className="admin-action-link">
              <i className="fa-solid fa-comments" style={{ marginRight: '8px' }} aria-hidden="true"></i> Duyệt bình luận
            </Link>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
