import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { supabase } from './supabaseClient';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement);

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TimeSection = styled.div`
  text-align: center;
`;

const TimeInput = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
`;

const SelectionsContainer = styled.div`
  display: flex;
  gap: 20px;
  justify-content: space-between;
`;

const SelectionGroup = styled.div`
  flex: 1;
`;

const Select = styled.select`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 100%;
  margin-top: 8px;
`;

const Input = styled.input`
  width: 60px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const Button = styled.button`
  padding: 10px 30px;
  background-color: #4F46E5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
`;

const Result = styled.div`
  margin-top: 20px;
  text-align: center;
`;

const Footer = styled.div`
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
  color: #666;
`;

const Credit = styled.div`
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: #666;
  a {
    color: #4F46E5;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

function App() {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [gender, setGender] = useState('');
  const [category, setCategory] = useState('');
  const [raceData, setRaceData] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [percentile, setPercentile] = useState(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calculatedTime, setCalculatedTime] = useState({
    hours: '',
    minutes: '',
    seconds: ''
  });

  // Tambahkan state untuk menyimpan gender dan category yang sudah dihitung
  const [calculatedSelection, setCalculatedSelection] = useState({
    gender: '',
    category: ''
  });

  useEffect(() => {
    // Hanya fetch data ketika tombol Hitung ditekan
    if (calculatedSelection.gender && calculatedSelection.category) {
      fetchData();
    }
  }, [calculatedSelection]); // Ubah dependency ke calculatedSelection

  const fetchData = async () => {
    if (!calculatedSelection.gender || !calculatedSelection.category) return;

    try {
      setIsLoading(true);
      console.log('Fetching data for:', calculatedSelection);
      
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('bormar')
          .select('*', { count: 'exact' })
          .eq('gender', calculatedSelection.gender)
          .eq('category', calculatedSelection.category)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          console.error('Supabase error:', error);
          return;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...data];
          page++;
          
          // Jika data yang diterima kurang dari pageSize, berarti sudah tidak ada lagi
          if (data.length < pageSize) {
            hasMore = false;
          }
        }
      }

      console.log('Raw data received:', {
        count: allData?.length,
        firstRecord: allData?.[0],
        lastRecord: allData?.[allData.length - 1]
      });

      // Konversi dan validasi data
      const validData = allData.filter(item => {
        return typeof item.time === 'number' && !isNaN(item.time) && item.time > 0;
      });

      // Sort dan log data untuk debugging
      const sortedData = [...validData].sort((a, b) => a.time - b.time);
      
      const timeToString = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      console.log('Data summary:', {
        totalRecords: allData.length,
        validRecords: validData.length,
        gender: calculatedSelection.gender,
        category: calculatedSelection.category,
        fastestTime: timeToString(sortedData[0]?.time),
        slowestTime: timeToString(sortedData[sortedData.length - 1]?.time),
        sampleTimes: sortedData.slice(0, 5).map(r => timeToString(r.time))
      });

      setRaceData(validData);
      setTotalResults(validData.length);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeInput = (value, setter) => {
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (numericValue.length <= 2) {
      if (numericValue === '') {
        setter('');
      } else {
        const num = parseInt(numericValue, 10);
        if (setter === setHours && num > 23) {
          setter('23');
        } else if ((setter === setMinutes || setter === setSeconds) && num > 59) {
          setter('59');
        } else {
          setter(numericValue);
        }
      }
    }
  };

  const calculatePercentile = () => {
    if (isLoading) {
      alert('Mohon tunggu, data sedang dimuat...');
      return;
    }

    if (!hours && !minutes && !seconds) {
      alert('Silakan masukkan waktu finis Anda');
      return;
    }

    if (!gender || !category) {
      alert('Silakan pilih jenis kelamin dan kategori lomba');
      return;
    }

    // Simpan waktu dan seleksi yang dihitung
    setCalculatedTime({
      hours,
      minutes,
      seconds
    });
    setCalculatedSelection({
      gender,
      category
    });

    // Reset data sebelumnya
    setRaceData([]);
    setPercentile(null);
    setIsCalculated(false);
  };

  // Tambahkan useEffect baru untuk menghitung persentil setelah data diambil
  useEffect(() => {
    if (raceData.length > 0 && calculatedTime.hours !== '') {
      const userTimeInSeconds = 
        (parseInt(calculatedTime.hours || '0') * 3600) + 
        (parseInt(calculatedTime.minutes || '0') * 60) + 
        parseInt(calculatedTime.seconds || '0');

      if (userTimeInSeconds === 0) {
        alert('Waktu tidak boleh 0');
        return;
      }

      // Hitung jumlah pelari yang lebih lambat
      const slowerRunners = raceData.filter(result => result.time > userTimeInSeconds);
      
      // Hitung persentase
      const percentageSlower = (slowerRunners.length / raceData.length) * 100;

      setPercentile(percentageSlower.toFixed(2));
      setIsCalculated(true);
    }
  }, [raceData, calculatedTime]);

  const getChartData = () => {
    const sortedData = [...raceData].sort((a, b) => a.time - b.time);
    
    const userTimeInSeconds = isCalculated ? 
      (parseInt(calculatedTime.hours || '0') * 3600) + 
      (parseInt(calculatedTime.minutes || '0') * 60) + 
      parseInt(calculatedTime.seconds || '0') : null;

    const userPosition = userTimeInSeconds ? 
      sortedData.findIndex(item => item.time > userTimeInSeconds) : -1;

    const chartTimes = sortedData.map(result => result.time / 3600);
    if (userTimeInSeconds) {
      chartTimes.splice(userPosition === -1 ? chartTimes.length : userPosition, 0, userTimeInSeconds / 3600);
    }

    return {
      labels: chartTimes.map(() => ''),
      datasets: [{
        data: chartTimes,
        backgroundColor: (context) => {
          if (!isCalculated) return 'rgba(99, 102, 241, 0.5)';
          const index = context.dataIndex;
          const userIndex = userPosition === -1 ? chartTimes.length - 1 : userPosition;
          return index === userIndex 
            ? 'rgba(239, 68, 68, 0.8)'
            : 'rgba(99, 102, 241, 0.1)';
        },
        borderColor: (context) => {
          if (!isCalculated) return 'rgba(99, 102, 241, 1)';
          const index = context.dataIndex;
          const userIndex = userPosition === -1 ? chartTimes.length - 1 : userPosition;
          return index === userIndex 
            ? 'rgba(185, 28, 28, 0.9)'
            : 'rgba(99, 102, 241, 0.2)';
        },
        borderWidth: (context) => {
          if (!isCalculated) return 1;
          const index = context.dataIndex;
          const userIndex = userPosition === -1 ? chartTimes.length - 1 : userPosition;
          return index === userIndex ? 2 : 1;
        },
        barPercentage: 1,
        categoryPercentage: (context) => {
          if (!isCalculated) return 1;
          const index = context.dataIndex;
          const userIndex = userPosition === -1 ? chartTimes.length - 1 : userPosition;
          return index === userIndex ? 1.1 : 1;
        },
      }]
    };
  };

  // Tambahkan fungsi untuk konversi waktu ke string
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dapatkan waktu terlama dari data yang diurutkan
  const getSlowestTime = () => {
    if (!raceData.length) return null;
    const sortedTimes = [...raceData].sort((a, b) => a.time - b.time);
    return sortedTimes[sortedTimes.length - 1].time;
  };

  return (
    <Container>
      <Title>Kalkulator Hasil Lomba Lari</Title>
      
      <Form>
        <TimeSection>
          <label>Waktu Finis (HH:MM:SS)</label>
          <TimeInput>
            <Input
              type="text"
              value={hours}
              onChange={(e) => formatTimeInput(e.target.value, setHours)}
              placeholder="00"
              maxLength="2"
            />
            :
            <Input
              type="text"
              value={minutes}
              onChange={(e) => formatTimeInput(e.target.value, setMinutes)}
              placeholder="00"
              maxLength="2"
            />
            :
            <Input
              type="text"
              value={seconds}
              onChange={(e) => formatTimeInput(e.target.value, setSeconds)}
              placeholder="00"
              maxLength="2"
            />
          </TimeInput>
        </TimeSection>

        <SelectionsContainer>
          <SelectionGroup>
            <label>Jenis Kelamin</label>
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Pilih jenis kelamin</option>
              <option value="Male">Laki-laki</option>
              <option value="Female">Perempuan</option>
            </Select>
          </SelectionGroup>

          <SelectionGroup>
            <label>Kategori Lomba</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Pilih kategori</option>
              <option value="Marathon">Marathon</option>
              <option value="Half Marathon">Half Marathon</option>
              <option value="10K">10K</option>
            </Select>
          </SelectionGroup>
        </SelectionsContainer>

        <ButtonContainer>
          <Button 
            onClick={calculatePercentile}
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Memuat Data...' : 'Hitung Perbandingan'}
          </Button>
        </ButtonContainer>
      </Form>

      {raceData.length > 0 && (
        <div style={{ marginTop: '30px', height: '300px' }}>
          <Bar
            data={getChartData()}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Waktu (Jam)'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const hours = Math.floor(context.raw);
                      const minutes = Math.floor((context.raw - hours) * 60);
                      const seconds = Math.floor(((context.raw - hours) * 60 - minutes) * 60);
                      return `Waktu: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      )}

      {percentile !== null && (
        <Result>
          <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>
            Waktu finis Anda: {calculatedTime.hours || '00'}:{calculatedTime.minutes || '00'}:{calculatedTime.seconds || '00'}
          </div>
          <div style={{ fontSize: '1.2em', marginBottom: '5px' }}>
            Kategori: {calculatedSelection.category}, {calculatedSelection.gender === 'Male' ? 'Laki-laki' : 'Perempuan'}
          </div>
          <div style={{ fontSize: '1.2em', color: '#4F46E5' }}>
            {parseFloat(percentile) > 0 
              ? `Waktu finis Anda lebih cepat daripada ${percentile}% pelari lainnya`
              : `Waktu finis Anda lebih lambat dari semua pelari di kategori ini (waktu terlama: ${formatTime(getSlowestTime())})`
            }
          </div>
        </Result>
      )}

      <Footer>
        Perhitungan berdasarkan 9.550 data hasil lomba Borobudur Marathon 2024
      </Footer>

      <Credit>
        Dibuat oleh <a href="https://www.threads.net/@harisfirda" target="_blank" rel="noopener noreferrer">Haris Firdaus</a>
      </Credit>
    </Container>
  );
}

export default App; 