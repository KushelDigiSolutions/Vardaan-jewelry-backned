import {
  LayoutDashboard,
  ShoppingCart,
  FolderOpen,
  ClipboardList,
  Users,
  Database,
  LogOut,
  Percent,
  RefreshCw,
  Mail,
  Image,
} from "lucide-react";

const Sidebar = ({ currentTab, onTabChange, adminUser, onLogout }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: ShoppingCart },
    { id: "categories", label: "Categories", icon: FolderOpen },
    { id: "hero", label: "Hero Settings", icon: Image },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "customers", label: "Customers", icon: Users },
    { id: "inventory", label: "Inventory", icon: Database },
    { id: "coupons", label: "Coupons", icon: Percent },
    { id: "replace", label: "Replacement", icon: RefreshCw },
    { id: "contacts", label: "Contact Inquiries", icon: Mail },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo ">
        <img
          src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png"
          alt="Vardaan Jewel"
          style={{
            width: "100%",
            maxWidth: "180px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <span
                className={`sidebar-link ${currentTab === item.id ? "active" : ""}`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        {adminUser && (
          <div className="user-profile-info">
            <div className="user-avatar">
              {adminUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{adminUser.name}</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
        )}
        <button
          className="btn btn-secondary btn-danger"
          onClick={onLogout}
          style={{ justifyContent: "center", width: "100%" }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
