import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseExample = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Example: Fetch data from a table
  const fetchData = async (tableName) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10);
      
      if (error) throw error;
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example: Insert data into a table
  const insertData = async (tableName, newData) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert([newData])
        .select();
      
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Example: Update data
  const updateData = async (tableName, id, updates) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Example: Delete data
  const deleteData = async (tableName, id) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Supabase CRUD Examples</h3>
      
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => fetchData('your_table_name')}>
          Fetch Data
        </button>
        <button onClick={() => insertData('your_table_name', { name: 'New Item' })}>
          Insert Data
        </button>
      </div>
      
      {data.length > 0 && (
        <div>
          <h4>Data:</h4>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Note:</strong> Replace 'your_table_name' with your actual table name</p>
        <p>This component demonstrates basic CRUD operations with Supabase.</p>
      </div>
    </div>
  );
};

export default SupabaseExample;


