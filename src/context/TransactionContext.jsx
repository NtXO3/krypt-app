import React, { useContext, useState } from "react";

import { ethers } from 'ethers'
import { contractAbi, contractAddress } from '../utils/constants'
import { createContext } from "react";
import { useEffect } from "react";

export const TransactionContext = createContext()

const { ethereum } = window;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(contractAddress, contractAbi, signer);

  return transactionContract
}

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [formData, setFormData] = useState({ addressTo: '', amount: '', keyword: '', message: ''})
  const [isLoading, setIsLoading] = useState(false)
  const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'))
  const [transactions, setTransactions] = useState([])

  const handleChange = (e, name) => {
    setFormData((prev) => ({...prev, [name]: e.target.value }))
  }

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return;

      const transactionContract = getEthereumContract();
      const availableTransactions = await transactionContract.getAllTransactions()

      const structuredTransactions = availableTransactions.map(item => ({
        amount: item.amount, 
        keyword: item.keyword, 
        message: item.message, 
        addressTo: item.receiver,
        addressFrom: item.sender,
        timestamp: new Date(item.timestamp.toNumber() * 1000).toLocaleString(),
        amount: +((item.amount._hex) / (10 ** 18))
      }))
      setTransactions(structuredTransactions)
    } catch (error) {
      console.error(error)
    }
  }

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) {
        return alert('Please install MetaMask')
      }
  
      const accounts = await ethereum.request({ method: 'eth_accounts' })
  
      if (accounts.length) {
        setCurrentAccount(accounts[0])
        
        getAllTransactions()
        // getAllTransactions();
      }
    } catch (error) {
      console.log('No accounts found')
    }
  }

  const checkIfTransactionsExist = async () => {
    try {
      const transactionContract = getEthereumContract();
      const transactionCount = await transactionContract.getTransactionCount()
      
      window.localStorage.setItem("transactionCount", transactionCount)
    } catch (err) {
      console.error(err)
    }
  }

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert('Install metamask')

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      setCurrentAccount(accounts[0])
    } catch (err) {
      console.error(err)
      throw new Error ('No Ethereum Object')
    }
  }

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert('Install metamask')

      const { addressTo, amount, keyword, message } = formData;
      const transactionContract = getEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount)

      setIsLoading(true)
      console.log('Loading....')

      await ethereum.request({ 
        method: 'eth_sendTransaction',
        params: [{
          from: currentAccount,
          to: addressTo,
          gas: '0x5208', // 21000 Gwei 
          value: parsedAmount._hex,
        }]
      })
      const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);

      await transactionHash.wait()
      setIsLoading(false)
      console.log(`Success - ${transactionHash.hash}`)
      const transactionCount = await transactionContract.getTransactionCount()
      setTransactionCount(transactionCount.toNumber())
      getAllTransactions()
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected()
    checkIfTransactionsExist()
  }, [])

  return (
    <TransactionContext.Provider
      value={{ connectWallet, currentAccount, handleChange, formData, setFormData, sendTransaction, transactions, isLoading }}
    >
      {children}
    </TransactionContext.Provider>
  )
}
