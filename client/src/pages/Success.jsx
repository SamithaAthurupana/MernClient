import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { userRequest } from "../requestMethods";

const Success = () => {
  const queryString = useLocation().search;
  const queryParams = new URLSearchParams(queryString);
  const customer_id = queryParams.get("customer_id");

  const [img, setImg] = useState("");

  useEffect(() => {
    const getOrder = async () => {
      try {
        if (customer_id) {
          const res = await userRequest.get(`/orders/findorder/${customer_id}`);
          setImg(res.data);
        } else {
          window.location.href = "http://localhost:3000";
        }
      } catch (err) {
        console.log(err);
      }
    };
    getOrder();
  }, [customer_id]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img src={img} alt="" target="_blank"></img>
      {/* Order successful
      <button style={{ padding: 10, marginTop: 20 }}>Go to Homepage</button> */}
    </div>
  );
};

export default Success;
